import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current authenticated user by Clerk identity.
 * Returns null if no user record exists yet.
 */
export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

/**
 * Look up a user by email or phone. If not found, create a ghost user.
 * Used when adding people to groups/expenses.
 */
export const findOrCreateByContact = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Try to find by email first
    if (args.email) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (byEmail) return byEmail._id;
    }

    // Try to find by phone
    if (args.phone) {
      const byPhone = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();
      if (byPhone) return byPhone._id;
    }

    // Create ghost user
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      status: "invited",
      defaultCurrency: "INR",
      invitedBy: args.invitedBy,
    });
  },
});

/**
 * Called on first login / every authenticated app mount.
 * Creates an active user record or merges an existing ghost
 * (match by email/phone, patch in clerkId + status "active").
 */
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user already exists with this clerkId
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      // Update name/avatar if changed in Clerk
      const updates: Record<string, string | undefined> = {};
      if (identity.name && identity.name !== existing.name) {
        updates.name = identity.name;
      }
      if (identity.pictureUrl && identity.pictureUrl !== existing.avatarUrl) {
        updates.avatarUrl = identity.pictureUrl;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    // Try to find a ghost user by email
    const email = identity.email ?? undefined;
    const phone = identity.phoneNumber ?? undefined;

    let ghostUser = null;

    if (email) {
      ghostUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      // Only merge if it's actually a ghost (invited) user
      if (ghostUser && ghostUser.status !== "invited") {
        ghostUser = null;
      }
    }

    if (!ghostUser && phone) {
      ghostUser = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first();
      if (ghostUser && ghostUser.status !== "invited") {
        ghostUser = null;
      }
    }

    if (ghostUser) {
      // Merge: patch ghost → active
      await ctx.db.patch(ghostUser._id, {
        clerkId: identity.subject,
        name: identity.name ?? ghostUser.name,
        email: email ?? ghostUser.email,
        phone: phone ?? ghostUser.phone,
        avatarUrl: identity.pictureUrl ?? ghostUser.avatarUrl,
        status: "active" as const,
      });
      return ghostUser._id;
    }

    // Create brand new active user
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "User",
      email,
      phone,
      avatarUrl: identity.pictureUrl ?? undefined,
      defaultCurrency: "INR",
      status: "active",
    });
  },
});
