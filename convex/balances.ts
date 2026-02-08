import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { canonicalPair } from "./helpers";

/**
 * Update balances for all pairs affected by an expense's splits.
 * Called after every expense insert/delete.
 */
export async function updateBalancesForExpense(
  ctx: MutationCtx,
  groupId: Id<"groups"> | undefined,
  currency: string,
  splits: { userId: Id<"users">; paidAmount: number; owedAmount: number }[]
) {
  // Collect unique user IDs from the splits
  const userIds = [...new Set(splits.map((s) => s.userId))];

  // Generate all unique canonical pairs
  const pairsSet = new Set<string>();
  const pairs: [Id<"users">, Id<"users">][] = [];

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const [u1, u2] = canonicalPair(userIds[i], userIds[j]);
      const key = `${u1}:${u2}`;
      if (!pairsSet.has(key)) {
        pairsSet.add(key);
        pairs.push([u1, u2]);
      }
    }
  }

  // For each pair, recalc context balance then friend balance
  for (const [u1, u2] of pairs) {
    await recalcContextBalance(ctx, u1, u2, groupId, currency);
    await recalcFriendBalance(ctx, u1, u2, currency);
  }
}

/**
 * Recalculate the balance between a canonical pair within a specific context
 * (group or non-group). Scans all non-deleted expenses in that context and
 * recomputes the net flow between the two users.
 */
async function recalcContextBalance(
  ctx: MutationCtx,
  user1: Id<"users">,
  user2: Id<"users">,
  groupId: Id<"groups"> | undefined,
  currency: string
) {
  let expenses;

  if (groupId) {
    // Get all non-deleted expenses in this group
    expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
  } else {
    // Non-group: find all expenses where both users have splits and no groupId
    expenses = await getAllNonGroupExpensesBetween(ctx, user1, user2);
  }

  expenses = expenses.filter((e) => !e.isDeleted);

  // Accumulate net flow: positive means user2 owes user1
  let netAmount = 0;

  for (const expense of expenses) {
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
      .collect();

    // Find splits for our two users
    const s1 = splits.find((s) => s.userId === user1);
    const s2 = splits.find((s) => s.userId === user2);

    if (!s1 && !s2) continue;

    // Compute pairwise flow using proportional attribution
    // Each participant's net = paidAmount - owedAmount
    // Positive net = lender, negative net = borrower
    const participantNets = splits.map((s) => ({
      userId: s.userId,
      net: s.paidAmount - s.owedAmount,
    }));

    const lenders = participantNets.filter((p) => p.net > 0);
    const borrowers = participantNets.filter((p) => p.net < 0);

    const totalLent = lenders.reduce((sum, l) => sum + l.net, 0);
    if (totalLent === 0) continue;

    // For each lender-borrower pair, compute flow
    for (const lender of lenders) {
      for (const borrower of borrowers) {
        // Only care about flows between user1 and user2
        const isRelevant =
          (lender.userId === user1 && borrower.userId === user2) ||
          (lender.userId === user2 && borrower.userId === user1);

        if (!isRelevant) continue;

        const flow = (Math.abs(borrower.net) * lender.net) / totalLent;

        if (lender.userId === user1) {
          // user1 lent to user2 → user2 owes user1 → positive
          netAmount += flow;
        } else {
          // user2 lent to user1 → user1 owes user2 → negative
          netAmount -= flow;
        }
      }
    }
  }

  // Round to 2 decimal places
  netAmount = Math.round(netAmount * 100) / 100;

  // Upsert into balances table
  const existing = await ctx.db
    .query("balances")
    .withIndex("by_pair_group", (q) =>
      q.eq("user1", user1).eq("user2", user2).eq("groupId", groupId)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      amount: netAmount,
      currency,
      updatedAt: Date.now(),
    });
  } else {
    await ctx.db.insert("balances", {
      user1,
      user2,
      groupId,
      currency,
      amount: netAmount,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Recalculate the aggregate friend balance for a canonical pair
 * by summing all context balances.
 */
async function recalcFriendBalance(
  ctx: MutationCtx,
  user1: Id<"users">,
  user2: Id<"users">,
  currency: string
) {
  const allContextBalances = await ctx.db
    .query("balances")
    .withIndex("by_pair", (q) => q.eq("user1", user1).eq("user2", user2))
    .collect();

  const totalAmount = allContextBalances.reduce((sum, b) => sum + b.amount, 0);
  const roundedTotal = Math.round(totalAmount * 100) / 100;

  const existing = await ctx.db
    .query("friendBalances")
    .withIndex("by_pair", (q) => q.eq("user1", user1).eq("user2", user2))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalAmount: roundedTotal,
      currency,
      lastActivityAt: Date.now(),
    });
  } else {
    await ctx.db.insert("friendBalances", {
      user1,
      user2,
      totalAmount: roundedTotal,
      currency,
      lastActivityAt: Date.now(),
    });
  }
}

/**
 * Get all non-group expenses where both user1 and user2 have splits.
 */
async function getAllNonGroupExpensesBetween(
  ctx: MutationCtx,
  user1: Id<"users">,
  user2: Id<"users">
) {
  // Get all splits for user1
  const user1Splits = await ctx.db
    .query("expenseSplits")
    .withIndex("by_user", (q) => q.eq("userId", user1))
    .collect();

  const results = [];

  for (const split of user1Splits) {
    const expense = await ctx.db.get(split.expenseId);
    if (!expense || expense.groupId !== undefined) continue;

    // Check if user2 also has a split
    const user2Split = await ctx.db
      .query("expenseSplits")
      .withIndex("by_user_expense", (q) =>
        q.eq("userId", user2).eq("expenseId", split.expenseId)
      )
      .first();

    if (user2Split) {
      results.push(expense);
    }
  }

  return results;
}
