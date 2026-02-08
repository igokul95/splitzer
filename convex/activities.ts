import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getAuthUser } from "./helpers";

/**
 * Get the current user's activity feed.
 * Merges activities from all groups the user is/was in, plus non-group activities.
 */
export const getMyActivities = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUser(ctx);

    // Get all group memberships (including "left" for historical activities)
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const groupIds = memberships.map((m) => m.groupId);

    // Collect activities from all groups
    const activityMap = new Map<string, Doc<"activities">>();

    for (const groupId of groupIds) {
      const groupActivities = await ctx.db
        .query("activities")
        .withIndex("by_group_time", (q) => q.eq("groupId", groupId))
        .order("desc")
        .take(50);

      for (const a of groupActivities) {
        activityMap.set(a._id, a);
      }
    }

    // Also get activities where I'm the actor (covers non-group activities)
    const myActivities = await ctx.db
      .query("activities")
      .withIndex("by_actor", (q) => q.eq("actorId", me._id))
      .order("desc")
      .take(50);

    for (const a of myActivities) {
      activityMap.set(a._id, a);
    }

    // Merge, sort by createdAt desc, take top 100
    const allActivities = [...activityMap.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);

    // Enrich with names
    const enriched = await Promise.all(
      allActivities.map(async (activity) => {
        const actorDoc = await ctx.db.get(activity.actorId);
        const actor = actorDoc as { name: string; avatarUrl?: string } | null;
        let groupName: string | undefined;
        if (activity.groupId) {
          const groupDoc = await ctx.db.get(activity.groupId);
          groupName = (groupDoc as { name: string } | null)?.name;
        }

        // Compute my involvement for expense activities
        let myAmount: number | undefined;
        if (activity.splitSummary) {
          const mySplit = activity.splitSummary.find(
            (s) => s.userId === me._id
          );
          if (mySplit) {
            myAmount = mySplit.amount; // negative = I owe, positive = I'm owed
          }
        }

        return {
          _id: activity._id,
          type: activity.type,
          actorId: activity.actorId,
          actorName: activity.actorId === me._id ? "You" : (actor?.name ?? "Unknown"),
          actorAvatarUrl: actor?.avatarUrl,
          groupId: activity.groupId,
          groupName,
          metadata: activity.metadata,
          myAmount,
          createdAt: activity.createdAt,
        };
      })
    );

    return enriched;
  },
});
