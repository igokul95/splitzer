import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the authenticated user from the Convex context.
 * Throws if the user is not authenticated or has no user record.
 */
export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("User record not found. Please sign in again.");
  return user;
}

/**
 * Returns [user1, user2] in canonical order (user1 < user2 by string comparison).
 * Used for consistent storage in balances and friendBalances tables.
 */
export function canonicalPair(
  a: Id<"users">,
  b: Id<"users">
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}
