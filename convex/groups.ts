import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./helpers";
import { Id } from "./_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all groups the current user is a member of (not "left").
 * For each group, includes the user's net balance and per-member balance breakdowns.
 */
export const getMyGroups = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUser(ctx);

    // Get all group memberships where I'm not "left"
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const activeMemberships = memberships.filter((m) => m.status !== "left");

    const groups = [];
    let overallOwed = 0; // positive = I'm owed, negative = I owe

    for (const membership of activeMemberships) {
      const group = await ctx.db.get(membership.groupId);
      if (!group) continue;

      // Get all balances in this group involving me
      const groupBalances = await ctx.db
        .query("balances")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();

      // Filter to only balances involving me
      const myBalances = groupBalances.filter(
        (b) => b.user1 === me._id || b.user2 === me._id
      );

      // Calculate my net in this group and per-member breakdowns
      let myNetInGroup = 0;
      const memberBalances: {
        userId: Id<"users">;
        name: string;
        amount: number; // positive = they owe me, negative = I owe them
        currency: string;
      }[] = [];

      for (const bal of myBalances) {
        if (bal.amount === 0) continue;
        const isUser1 = bal.user1 === me._id;
        // If I'm user1 and amount is positive, user2 owes me
        // If I'm user2 and amount is positive, I owe user1
        const net = isUser1 ? bal.amount : -bal.amount;
        myNetInGroup += net;

        const otherUserId = isUser1 ? bal.user2 : bal.user1;
        const otherUser = await ctx.db.get(otherUserId);

        memberBalances.push({
          userId: otherUserId,
          name: otherUser?.name ?? "Unknown",
          amount: net,
          currency: bal.currency,
        });
      }

      overallOwed += myNetInGroup;

      // Get member count
      const memberCount = (
        await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect()
      ).filter((m) => m.status !== "left").length;

      groups.push({
        _id: group._id,
        name: group.name,
        type: group.type,
        defaultCurrency: group.defaultCurrency,
        simplifyDebts: group.simplifyDebts,
        avatarUrl: group.avatarUrl,
        myNet: myNetInGroup,
        memberBalances: memberBalances.sort(
          (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
        ),
        memberCount,
        myRole: membership.role,
      });
    }

    return {
      groups,
      overallOwed,
      defaultCurrency: me.defaultCurrency,
    };
  },
});

/**
 * Get a single group by ID, with members and the current user's balance.
 */
export const getGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    // Verify membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!membership || membership.status === "left") {
      throw new Error("You are not a member of this group");
    }

    // Get all active members with user details
    const allMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const activeMembers = allMembers.filter((m) => m.status !== "left");

    const membersWithDetails = await Promise.all(
      activeMembers.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          name: user?.name ?? "Unknown",
          email: user?.email,
          avatarUrl: user?.avatarUrl,
          role: m.role,
          status: m.status,
        };
      })
    );

    // Get my balances in this group
    const groupBalances = await ctx.db
      .query("balances")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const myBalances = groupBalances.filter(
      (b) => b.user1 === me._id || b.user2 === me._id
    );

    let myNet = 0;
    const balanceDetails: {
      userId: Id<"users">;
      name: string;
      amount: number;
      currency: string;
    }[] = [];

    for (const bal of myBalances) {
      if (bal.amount === 0) continue;
      const isUser1 = bal.user1 === me._id;
      const net = isUser1 ? bal.amount : -bal.amount;
      myNet += net;

      const otherUserId = isUser1 ? bal.user2 : bal.user1;
      const otherUser = await ctx.db.get(otherUserId);

      balanceDetails.push({
        userId: otherUserId,
        name: otherUser?.name ?? "Unknown",
        amount: net,
        currency: bal.currency,
      });
    }

    // Get all balances in the group (for the Balances tab)
    const allBalanceDetails: {
      user1Id: Id<"users">;
      user1Name: string;
      user2Id: Id<"users">;
      user2Name: string;
      amount: number;
      currency: string;
    }[] = [];

    for (const bal of groupBalances) {
      if (bal.amount === 0) continue;
      const user1 = await ctx.db.get(bal.user1);
      const user2 = await ctx.db.get(bal.user2);
      allBalanceDetails.push({
        user1Id: bal.user1,
        user1Name: user1?.name ?? "Unknown",
        user2Id: bal.user2,
        user2Name: user2?.name ?? "Unknown",
        amount: bal.amount,
        currency: bal.currency,
      });
    }

    return {
      ...group,
      members: membersWithDetails,
      memberCount: activeMembers.length,
      myNet,
      myBalances: balanceDetails.sort(
        (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
      ),
      allBalances: allBalanceDetails,
      myRole: membership.role,
      defaultCurrency: group.defaultCurrency,
    };
  },
});

/**
 * Get all members of a group (including those who have left).
 */
export const getGroupMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!membership || membership.status === "left") {
      throw new Error("You are not a member of this group");
    }

    const allMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    return await Promise.all(
      allMembers.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          name: user?.name ?? "Unknown",
          email: user?.email,
          phone: user?.phone,
          avatarUrl: user?.avatarUrl,
          role: m.role,
          status: m.status,
          userStatus: user?.status ?? "invited",
          joinedAt: m.joinedAt,
        };
      })
    );
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a new group with initial members.
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    type: v.optional(
      v.union(
        v.literal("trip"),
        v.literal("home"),
        v.literal("couple"),
        v.literal("other")
      )
    ),
    defaultCurrency: v.string(),
    simplifyDebts: v.boolean(),
    members: v.array(
      v.object({
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    // Create the group
    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      createdBy: me._id,
      defaultCurrency: args.defaultCurrency,
      simplifyDebts: args.simplifyDebts,
      type: args.type,
    });

    // Add the creator as admin
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: me._id,
      role: "admin",
      status: "joined",
      invitedBy: me._id,
      joinedAt: Date.now(),
    });

    // Add each invited member
    for (const member of args.members) {
      // Find or create user (ghost if not exists)
      let userId: Id<"users">;

      // Check email first
      if (member.email) {
        const byEmail = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", member.email))
          .first();
        if (byEmail) {
          userId = byEmail._id;
        } else {
          userId = await ctx.db.insert("users", {
            name: member.name,
            email: member.email,
            phone: member.phone,
            status: "invited",
            defaultCurrency: args.defaultCurrency,
            invitedBy: me._id,
          });
        }
      } else if (member.phone) {
        const byPhone = await ctx.db
          .query("users")
          .withIndex("by_phone", (q) => q.eq("phone", member.phone))
          .first();
        if (byPhone) {
          userId = byPhone._id;
        } else {
          userId = await ctx.db.insert("users", {
            name: member.name,
            phone: member.phone,
            status: "invited",
            defaultCurrency: args.defaultCurrency,
            invitedBy: me._id,
          });
        }
      } else {
        // No contact info — create ghost with just name
        userId = await ctx.db.insert("users", {
          name: member.name,
          status: "invited",
          defaultCurrency: args.defaultCurrency,
          invitedBy: me._id,
        });
      }

      // Skip if it's the creator themselves
      if (userId === me._id) continue;

      // Check they aren't already a member
      const existingMembership = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_user", (q) =>
          q.eq("groupId", groupId).eq("userId", userId)
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "member",
          status: "invited",
          invitedBy: me._id,
        });

        // Log member_added activity
        const user = await ctx.db.get(userId);
        await ctx.db.insert("activities", {
          type: "member_added",
          actorId: me._id,
          groupId,
          involvedUserIds: [me._id, userId],
          metadata: {
            memberName: user?.name ?? member.name,
            memberUserId: userId,
          },
          createdAt: Date.now(),
        });
      }
    }

    // Log group_created activity
    await ctx.db.insert("activities", {
      type: "group_created",
      actorId: me._id,
      groupId,
      involvedUserIds: [me._id],
      metadata: {
        description: args.name,
      },
      createdAt: Date.now(),
    });

    return groupId;
  },
});

/**
 * Update group settings.
 */
export const updateGroup = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("trip"),
        v.literal("home"),
        v.literal("couple"),
        v.literal("other")
      )
    ),
    defaultCurrency: v.optional(v.string()),
    simplifyDebts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    // Verify membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!membership || membership.status === "left") {
      throw new Error("You are not a member of this group");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.defaultCurrency !== undefined)
      updates.defaultCurrency = args.defaultCurrency;
    if (args.simplifyDebts !== undefined)
      updates.simplifyDebts = args.simplifyDebts;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.groupId, updates);

      // Log activity
      await ctx.db.insert("activities", {
        type: "group_updated",
        actorId: me._id,
        groupId: args.groupId,
        involvedUserIds: [me._id],
        metadata: {
          description: args.name ?? group.name,
        },
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Add a new member to an existing group.
 */
export const addMember = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!membership || membership.status === "left") {
      throw new Error("You are not a member of this group");
    }

    // Find or create the user
    let userId: Id<"users"> | null = null;

    if (args.email) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (byEmail) userId = byEmail._id;
    }

    if (!userId && args.phone) {
      const byPhone = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();
      if (byPhone) userId = byPhone._id;
    }

    if (!userId) {
      const group = await ctx.db.get(args.groupId);
      userId = await ctx.db.insert("users", {
        name: args.name,
        email: args.email,
        phone: args.phone,
        status: "invited",
        defaultCurrency: group?.defaultCurrency ?? "INR",
        invitedBy: me._id,
      });
    }

    // Check existing membership
    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId!)
      )
      .first();

    if (existingMembership) {
      if (existingMembership.status === "left") {
        // Re-add: set back to invited
        await ctx.db.patch(existingMembership._id, {
          status: "invited",
          invitedBy: me._id,
        });
      } else {
        throw new Error("User is already a member of this group");
      }
    } else {
      await ctx.db.insert("groupMembers", {
        groupId: args.groupId,
        userId,
        role: "member",
        status: "invited",
        invitedBy: me._id,
      });
    }

    // Log activity
    const user = await ctx.db.get(userId);
    await ctx.db.insert("activities", {
      type: "member_added",
      actorId: me._id,
      groupId: args.groupId,
      involvedUserIds: [me._id, userId],
      metadata: {
        memberName: user?.name ?? args.name,
        memberUserId: userId,
      },
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Remove a member from a group. Only admins can remove others.
 * Member's net group balance must be zero.
 */
export const removeMember = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    // Verify the actor is an admin
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!myMembership || myMembership.status === "left") {
      throw new Error("You are not a member of this group");
    }
    if (myMembership.role !== "admin") {
      throw new Error("Only admins can remove members");
    }

    // Can't remove yourself — use leaveGroup instead
    if (args.userId === me._id) {
      throw new Error("Use leaveGroup to leave the group");
    }

    // Check the target member exists
    const targetMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .first();

    if (!targetMembership || targetMembership.status === "left") {
      throw new Error("User is not a member of this group");
    }

    // Check net balance is zero
    await assertZeroGroupBalance(ctx, args.userId, args.groupId);

    // Mark as left
    await ctx.db.patch(targetMembership._id, { status: "left" });

    // Log activity
    const removedUser = await ctx.db.get(args.userId);
    await ctx.db.insert("activities", {
      type: "member_removed",
      actorId: me._id,
      groupId: args.groupId,
      involvedUserIds: [me._id, args.userId],
      metadata: {
        memberName: removedUser?.name ?? "Unknown",
        memberUserId: args.userId,
      },
      createdAt: Date.now(),
    });
  },
});

/**
 * Current user leaves a group. Net balance must be zero.
 */
export const leaveGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!membership || membership.status === "left") {
      throw new Error("You are not a member of this group");
    }

    // Check net balance is zero
    await assertZeroGroupBalance(ctx, me._id, args.groupId);

    await ctx.db.patch(membership._id, { status: "left" });

    // Log activity
    await ctx.db.insert("activities", {
      type: "member_removed",
      actorId: me._id,
      groupId: args.groupId,
      involvedUserIds: [me._id],
      metadata: {
        memberName: me.name,
        memberUserId: me._id,
      },
      createdAt: Date.now(),
    });
  },
});

/**
 * Delete a group. Only admin can delete. All balances must be zero.
 */
export const deleteGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", me._id)
      )
      .first();

    if (!membership || membership.status === "left") {
      throw new Error("You are not a member of this group");
    }
    if (membership.role !== "admin") {
      throw new Error("Only admins can delete the group");
    }

    // Check all group balances are zero
    const groupBalances = await ctx.db
      .query("balances")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const hasNonZero = groupBalances.some((b) => Math.abs(b.amount) > 0.01);
    if (hasNonZero) {
      throw new Error(
        "Cannot delete group with outstanding balances. Settle all debts first."
      );
    }

    // Mark all members as left
    const allMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const m of allMembers) {
      if (m.status !== "left") {
        await ctx.db.patch(m._id, { status: "left" });
      }
    }

    // Delete the group document
    await ctx.db.delete(args.groupId);
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Assert that a user's net balance within a group is zero.
 * Throws if they have outstanding balances.
 */
async function assertZeroGroupBalance(
  ctx: { db: MutationCtx["db"] },
  userId: Id<"users">,
  groupId: Id<"groups">
) {
  const groupBalances = await ctx.db
    .query("balances")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  const myBalances = groupBalances.filter(
    (b) => b.user1 === userId || b.user2 === userId
  );

  const hasNonZero = myBalances.some((b) => Math.abs(b.amount) > 0.01);

  if (hasNonZero) {
    throw new Error(
      "Cannot leave group with outstanding balances. Settle up first."
    );
  }
}
