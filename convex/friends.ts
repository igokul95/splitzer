import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, canonicalPair } from "./helpers";
import { Id } from "./_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get all friends for the current user.
 * Friends are derived from two sources:
 *   1. friendBalances table (anyone with an expense balance)
 *   2. Group co-membership (anyone you share a group with)
 * Returns visible friends, hidden friends, and overall per-currency totals.
 */
export const getMyFriends = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUser(ctx);

    // ── Source 1: friendBalances ──────────────────────────────────────────
    const fbAsUser1 = await ctx.db
      .query("friendBalances")
      .withIndex("by_user1", (q) => q.eq("user1", me._id))
      .collect();

    const fbAsUser2 = await ctx.db
      .query("friendBalances")
      .withIndex("by_user2", (q) => q.eq("user2", me._id))
      .collect();

    const allFriendBalances = [...fbAsUser1, ...fbAsUser2];

    // Map friendId -> friendBalance data for quick lookup
    const fbByFriendId = new Map<
      string,
      { net: number; currency: string; lastActivityAt: number }
    >();
    for (const fb of allFriendBalances) {
      const isUser1 = fb.user1 === me._id;
      const friendId = isUser1 ? fb.user2 : fb.user1;
      const net = isUser1 ? fb.totalAmount : -fb.totalAmount;
      fbByFriendId.set(friendId, {
        net,
        currency: fb.currency,
        lastActivityAt: fb.lastActivityAt,
      });
    }

    // ── Source 2: Group co-members ───────────────────────────────────────
    // Find all people the current user shares groups with
    const myMemberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const myGroupIds = myMemberships
      .filter((m) => m.status !== "left")
      .map((m) => m.groupId);

    const coMemberIds = new Set<string>();
    for (const gId of myGroupIds) {
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", gId))
        .collect();
      for (const m of members) {
        if (m.userId !== me._id && m.status !== "left") {
          coMemberIds.add(m.userId);
        }
      }
    }

    // ── Merge: build unique friend IDs from both sources ─────────────────
    const allFriendIds = new Set<string>([
      ...fbByFriendId.keys(),
      ...coMemberIds,
    ]);

    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // ── Per-currency overall totals from balances table ───────────────────
    const balAsUser1 = await ctx.db
      .query("balances")
      .withIndex("by_user1", (q) => q.eq("user1", me._id))
      .collect();
    const balAsUser2 = await ctx.db
      .query("balances")
      .withIndex("by_user2", (q) => q.eq("user2", me._id))
      .collect();

    const allBalances = [...balAsUser1, ...balAsUser2];

    const currencyTotals: Record<string, { youOwe: number; youAreOwed: number }> = {};

    for (const bal of allBalances) {
      if (Math.abs(bal.amount) < 0.005) continue;
      const isUser1 = bal.user1 === me._id;
      const net = isUser1 ? bal.amount : -bal.amount;
      const currency = bal.currency;

      if (!currencyTotals[currency]) {
        currencyTotals[currency] = { youOwe: 0, youAreOwed: 0 };
      }

      if (net > 0) {
        currencyTotals[currency].youAreOwed += net;
      } else {
        currencyTotals[currency].youOwe += Math.abs(net);
      }
    }

    const youOwe = Object.entries(currencyTotals)
      .filter(([, v]) => v.youOwe > 0.005)
      .map(([currency, v]) => ({ currency, amount: v.youOwe }));

    const youAreOwed = Object.entries(currencyTotals)
      .filter(([, v]) => v.youAreOwed > 0.005)
      .map(([currency, v]) => ({ currency, amount: v.youAreOwed }));

    // ── Build friend list with details ───────────────────────────────────
    const friends = await Promise.all(
      [...allFriendIds].map(async (fId) => {
        const friendId = fId as Id<"users">;
        const friend = await ctx.db.get(friendId);

        // Use friendBalance data if it exists, otherwise defaults
        const fbData = fbByFriendId.get(fId);
        const net = fbData?.net ?? 0;
        const currency = fbData?.currency ?? me.defaultCurrency;
        const lastActivityAt = fbData?.lastActivityAt ?? now; // co-members without balance are "recent"

        // Get per-group breakdowns from balances table
        const [u1, u2] = canonicalPair(me._id, friendId);
        const pairBalances = await ctx.db
          .query("balances")
          .withIndex("by_pair", (q) => q.eq("user1", u1).eq("user2", u2))
          .collect();

        const groupBreakdowns: {
          groupId: Id<"groups"> | undefined;
          groupName: string;
          amount: number;
          currency: string;
        }[] = [];

        for (const bal of pairBalances) {
          if (Math.abs(bal.amount) < 0.005) continue;
          const balNet = u1 === me._id ? bal.amount : -bal.amount;
          let groupName = "Non-group";
          if (bal.groupId) {
            const group = await ctx.db.get(bal.groupId);
            groupName = group?.name ?? "Deleted group";
          }
          groupBreakdowns.push({
            groupId: bal.groupId,
            groupName,
            amount: balNet,
            currency: bal.currency,
          });
        }

        return {
          friendId,
          name: friend?.name ?? "Unknown",
          avatarUrl: friend?.avatarUrl,
          status: friend?.status ?? "invited",
          net,
          currency,
          lastActivityAt,
          groupBreakdowns: groupBreakdowns.sort(
            (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
          ),
        };
      })
    );

    // Split into visible and hidden
    const visible = friends
      .filter((f) => f.net !== 0 || now - f.lastActivityAt < ONE_WEEK)
      .sort((a, b) => a.name.localeCompare(b.name));

    const hidden = friends
      .filter((f) => f.net === 0 && now - f.lastActivityAt >= ONE_WEEK)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      visible,
      hidden,
      youOwe,
      youAreOwed,
      defaultCurrency: me.defaultCurrency,
    };
  },
});

/**
 * Get detailed info for a specific friend.
 * Includes balance, per-group breakdowns, and shared expenses.
 */
export const getFriendDetail = query({
  args: { friendId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);
    const friend = await ctx.db.get(args.friendId);
    if (!friend) throw new Error("User not found");

    // Get friend balance
    const [u1, u2] = canonicalPair(me._id, args.friendId);
    const friendBalance = await ctx.db
      .query("friendBalances")
      .withIndex("by_pair", (q) => q.eq("user1", u1).eq("user2", u2))
      .first();

    const overallNet = friendBalance
      ? u1 === me._id
        ? friendBalance.totalAmount
        : -friendBalance.totalAmount
      : 0;

    // Get per-group breakdowns
    const pairBalances = await ctx.db
      .query("balances")
      .withIndex("by_pair", (q) => q.eq("user1", u1).eq("user2", u2))
      .collect();

    const groupBreakdowns: {
      groupId: Id<"groups"> | undefined;
      groupName: string;
      amount: number;
      currency: string;
    }[] = [];

    for (const bal of pairBalances) {
      if (Math.abs(bal.amount) < 0.005) continue;
      const balNet = u1 === me._id ? bal.amount : -bal.amount;
      let groupName = "Non-group";
      if (bal.groupId) {
        const group = await ctx.db.get(bal.groupId);
        groupName = group?.name ?? "Deleted group";
      }
      groupBreakdowns.push({
        groupId: bal.groupId,
        groupName,
        amount: balNet,
        currency: bal.currency,
      });
    }

    // Get shared expenses: find expenses where both me and friend have splits
    // First, get all of the friend's splits
    const friendSplits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .collect();

    // For each, check if I also have a split on the same expense
    const sharedExpenses: {
      _id: Id<"expenses">;
      description: string;
      totalAmount: number;
      currency: string;
      category?: string;
      date: number;
      isSettlement: boolean;
      paidByName: string;
      paidByAmount: number;
      myInvolvement: {
        type: "borrowed" | "lent" | "settled_up" | "not_involved";
        amount: number;
      };
    }[] = [];

    const seenExpenseIds = new Set<string>();

    for (const fSplit of friendSplits) {
      if (seenExpenseIds.has(fSplit.expenseId)) continue;

      // Check if I have a split on this expense
      const mySplit = await ctx.db
        .query("expenseSplits")
        .withIndex("by_user_expense", (q) =>
          q.eq("userId", me._id).eq("expenseId", fSplit.expenseId)
        )
        .first();

      if (!mySplit) continue;
      seenExpenseIds.add(fSplit.expenseId);

      // Get the expense details
      const expense = await ctx.db.get(fSplit.expenseId);
      if (!expense || expense.isDeleted) continue;

      // Determine who paid
      const payer = await ctx.db.get(expense.paidBy);
      const paidByName =
        expense.paidBy === me._id
          ? "You"
          : payer?.name ?? "Unknown";

      // Determine my involvement: net = paidAmount - owedAmount
      const myNet = mySplit.paidAmount - mySplit.owedAmount;
      let myInvolvement: {
        type: "borrowed" | "lent" | "settled_up" | "not_involved";
        amount: number;
      };

      if (Math.abs(myNet) < 0.005) {
        myInvolvement = { type: "settled_up", amount: 0 };
      } else if (myNet > 0) {
        myInvolvement = { type: "lent", amount: myNet };
      } else {
        myInvolvement = { type: "borrowed", amount: Math.abs(myNet) };
      }

      sharedExpenses.push({
        _id: expense._id,
        description: expense.description,
        totalAmount: expense.totalAmount,
        currency: expense.currency,
        category: expense.category,
        date: expense.date,
        isSettlement: expense.isSettlement,
        paidByName,
        paidByAmount: expense.totalAmount,
        myInvolvement,
      });
    }

    // Sort expenses by date descending
    sharedExpenses.sort((a, b) => b.date - a.date);

    // Abbreviate friend name for display (e.g. "Abin Benny" -> "Abin B.")
    const nameParts = friend.name.split(" ");
    const shortName =
      nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : friend.name;

    return {
      friend: {
        _id: friend._id,
        name: friend.name,
        shortName,
        avatarUrl: friend.avatarUrl,
        email: friend.email,
        phone: friend.phone,
        status: friend.status,
      },
      overallNet,
      currency: friendBalance?.currency ?? me.defaultCurrency,
      groupBreakdowns: groupBreakdowns.sort(
        (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
      ),
      sharedExpenses,
    };
  },
});
