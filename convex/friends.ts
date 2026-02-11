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

    // Get per-group breakdowns from balances table
    const pairBalances = await ctx.db
      .query("balances")
      .withIndex("by_pair", (q) => q.eq("user1", u1).eq("user2", u2))
      .collect();

    // Build a map of groupId -> balance for quick lookup
    const groupBalanceMap = new Map<string, { amount: number; currency: string }>();
    for (const bal of pairBalances) {
      const balNet = u1 === me._id ? bal.amount : -bal.amount;
      const key = bal.groupId ?? "__non_group__";
      groupBalanceMap.set(key, { amount: balNet, currency: bal.currency });
    }

    // Get ALL shared groups (both users are members, not just groups with balances)
    const myMemberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const friendMemberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .collect();

    const myGroupIds = new Set(myMemberships.map((m) => m.groupId as string));
    const sharedGroupIds = friendMemberships
      .filter((m) => myGroupIds.has(m.groupId as string))
      .map((m) => m.groupId);
    // Deduplicate
    const uniqueSharedGroupIds = [...new Set(sharedGroupIds)];

    const sharedGroups: {
      groupId: Id<"groups">;
      groupName: string;
      amount: number;
      currency: string;
    }[] = [];

    for (const gId of uniqueSharedGroupIds) {
      const group = await ctx.db.get(gId);
      if (!group) continue;
      const bal = groupBalanceMap.get(gId as string);
      sharedGroups.push({
        groupId: gId,
        groupName: group.name,
        amount: bal?.amount ?? 0,
        currency: bal?.currency ?? me.defaultCurrency,
      });
    }

    // Aggregate balances by source (group vs non-group) and currency
    const groupCurrencyMap = new Map<string, number>();
    const nonGroupCurrencyMap = new Map<string, number>();

    for (const bal of pairBalances) {
      const balNet = u1 === me._id ? bal.amount : -bal.amount;
      const map = bal.groupId ? groupCurrencyMap : nonGroupCurrencyMap;
      const prev = map.get(bal.currency) ?? 0;
      map.set(bal.currency, prev + balNet);
    }

    const balancesByCurrency: Array<{ source: "group" | "nonGroup"; currency: string; net: number }> = [];

    for (const [currency, net] of groupCurrencyMap) {
      if (Math.abs(net) >= 0.005) {
        balancesByCurrency.push({ source: "group", currency, net });
      }
    }
    for (const [currency, net] of nonGroupCurrencyMap) {
      if (Math.abs(net) >= 0.005) {
        balancesByCurrency.push({ source: "nonGroup", currency, net });
      }
    }

    // groupBreakdowns for backward compat (only non-zero balances)
    const groupBreakdowns = sharedGroups
      .filter((g) => Math.abs(g.amount) > 0.005)
      .map((g) => ({
        groupId: g.groupId as Id<"groups"> | undefined,
        groupName: g.groupName,
        amount: g.amount,
        currency: g.currency,
      }));

    // Also include non-group balance if it exists
    const nonGroupBal = groupBalanceMap.get("__non_group__");
    if (nonGroupBal && Math.abs(nonGroupBal.amount) > 0.005) {
      groupBreakdowns.push({
        groupId: undefined,
        groupName: "Non-group",
        amount: nonGroupBal.amount,
        currency: nonGroupBal.currency,
      });
    }

    // Get non-group shared expenses only (expenses where both users have splits and no groupId)
    const friendSplits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_user", (q) => q.eq("userId", args.friendId))
      .collect();

    const nonGroupExpenses: {
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

      const mySplit = await ctx.db
        .query("expenseSplits")
        .withIndex("by_user_expense", (q) =>
          q.eq("userId", me._id).eq("expenseId", fSplit.expenseId)
        )
        .first();

      if (!mySplit) continue;
      seenExpenseIds.add(fSplit.expenseId);

      const expense = await ctx.db.get(fSplit.expenseId);
      if (!expense || expense.isDeleted) continue;

      // Only include non-group expenses as individual items
      if (expense.groupId) continue;

      const payer = await ctx.db.get(expense.paidBy);
      const paidByName =
        expense.paidBy === me._id
          ? "You"
          : payer?.name ?? "Unknown";

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

      nonGroupExpenses.push({
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

    nonGroupExpenses.sort((a, b) => b.date - a.date);

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
      balancesByCurrency,
      groupBreakdowns: groupBreakdowns.sort(
        (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
      ),
      sharedGroups: sharedGroups.sort((a, b) => a.groupName.localeCompare(b.groupName)),
      nonGroupExpenses,
    };
  },
});
