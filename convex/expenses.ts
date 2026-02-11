import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser } from "./helpers";
import { updateBalancesForExpense } from "./balances";

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Add a new expense with splits.
 */
export const addExpense = mutation({
  args: {
    groupId: v.optional(v.id("groups")),
    paidBy: v.id("users"),
    description: v.string(),
    totalAmount: v.number(),
    currency: v.string(),
    category: v.optional(v.string()),
    date: v.number(),
    splitMethod: v.union(
      v.literal("equal"),
      v.literal("exact"),
      v.literal("percentage"),
      v.literal("shares")
    ),
    splits: v.array(
      v.object({
        userId: v.id("users"),
        paidAmount: v.number(),
        owedAmount: v.number(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    // If groupId, verify current user is a group member
    if (args.groupId) {
      const membership = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_user", (q) =>
          q.eq("groupId", args.groupId!).eq("userId", me._id)
        )
        .first();

      if (!membership || membership.status === "left") {
        throw new Error("You are not a member of this group");
      }
    }

    // Validate splits sum
    const totalPaid = args.splits.reduce((s, sp) => s + sp.paidAmount, 0);
    const totalOwed = args.splits.reduce((s, sp) => s + sp.owedAmount, 0);

    if (Math.abs(totalPaid - args.totalAmount) > 0.02) {
      throw new Error(
        `Split paid amounts (${totalPaid}) don't match total (${args.totalAmount})`
      );
    }
    if (Math.abs(totalOwed - args.totalAmount) > 0.02) {
      throw new Error(
        `Split owed amounts (${totalOwed}) don't match total (${args.totalAmount})`
      );
    }

    // Compute denormalized counts
    const payerCount = args.splits.filter((s) => s.paidAmount > 0).length;
    const splitCount = args.splits.filter((s) => s.owedAmount > 0).length;

    // Insert expense
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      paidBy: args.paidBy,
      description: args.description,
      totalAmount: args.totalAmount,
      currency: args.currency,
      category: args.category,
      date: args.date,
      createdBy: me._id,
      splitMethod: args.splitMethod,
      isSettlement: false,
      isMultiPayer: payerCount > 1,
      payerCount,
      splitCount,
      notes: args.notes,
    });

    // Insert splits
    for (const split of args.splits) {
      await ctx.db.insert("expenseSplits", {
        expenseId,
        userId: split.userId,
        paidAmount: split.paidAmount,
        owedAmount: split.owedAmount,
      });
    }

    // Update balances
    await updateBalancesForExpense(ctx, args.groupId, args.splits);

    // Log activity
    const payer = await ctx.db.get(args.paidBy);
    await ctx.db.insert("activities", {
      type: "expense_added",
      actorId: me._id,
      groupId: args.groupId,
      expenseId,
      involvedUserIds: args.splits.map((s) => s.userId),
      metadata: {
        description: args.description,
        totalAmount: args.totalAmount,
        currency: args.currency,
        paidByName: args.paidBy === me._id ? me.name : (payer?.name ?? "Unknown"),
        paidByUserId: args.paidBy,
        payerCount,
        splitCount,
      },
      splitSummary: args.splits.map((s) => ({
        userId: s.userId,
        amount: s.owedAmount - s.paidAmount,
      })),
      createdAt: Date.now(),
    });

    return expenseId;
  },
});

/**
 * Soft-delete an expense and recalculate balances.
 */
export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new Error("Expense not found");
    if (expense.isDeleted) throw new Error("Expense already deleted");

    // Soft delete
    await ctx.db.patch(args.expenseId, {
      isDeleted: true,
      deletedBy: me._id,
      deletedAt: Date.now(),
    });

    // Get splits to recalculate balances
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await updateBalancesForExpense(
      ctx,
      expense.groupId,
      splits.map((s) => ({
        userId: s.userId,
        paidAmount: s.paidAmount,
        owedAmount: s.owedAmount,
      }))
    );

    // Log activity
    await ctx.db.insert("activities", {
      type: "expense_deleted",
      actorId: me._id,
      groupId: expense.groupId,
      expenseId: args.expenseId,
      involvedUserIds: splits.map((s) => s.userId),
      metadata: {
        description: expense.description,
        totalAmount: expense.totalAmount,
        currency: expense.currency,
      },
      createdAt: Date.now(),
    });
  },
});

/**
 * Record a settlement payment between two users.
 */
export const settleUp = mutation({
  args: {
    payerId: v.id("users"),
    payeeId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const payer = await ctx.db.get(args.payerId);
    const payee = await ctx.db.get(args.payeeId);
    if (!payer || !payee) throw new Error("User not found");

    const splits = [
      { userId: args.payerId, paidAmount: args.amount, owedAmount: 0 },
      { userId: args.payeeId, paidAmount: 0, owedAmount: args.amount },
    ];

    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      paidBy: args.payerId,
      description: "Settlement",
      totalAmount: args.amount,
      currency: args.currency,
      date: Date.now(),
      createdBy: me._id,
      splitMethod: "exact",
      isSettlement: true,
      isMultiPayer: false,
      payerCount: 1,
      splitCount: 2,
    });

    for (const split of splits) {
      await ctx.db.insert("expenseSplits", {
        expenseId,
        userId: split.userId,
        paidAmount: split.paidAmount,
        owedAmount: split.owedAmount,
      });
    }

    await updateBalancesForExpense(ctx, args.groupId, splits);

    // Log activity
    await ctx.db.insert("activities", {
      type: "settlement",
      actorId: me._id,
      groupId: args.groupId,
      expenseId,
      involvedUserIds: [args.payerId, args.payeeId],
      metadata: {
        totalAmount: args.amount,
        currency: args.currency,
        paidByName: payer.name,
        paidByUserId: args.payerId,
        settlementToName: payee.name,
        settlementToUserId: args.payeeId,
      },
      createdAt: Date.now(),
    });

    return expenseId;
  },
});

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get full details for a single expense, including splits with resolved user names.
 */
export const getExpenseDetail = query({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const me = await getAuthUser(ctx);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new Error("Expense not found");

    // Payer name
    const payer = await ctx.db.get(expense.paidBy);
    const payerName =
      expense.paidBy === me._id ? "You" : (payer?.name ?? "Unknown");

    // Group name
    let groupName: string | null = null;
    if (expense.groupId) {
      const group = await ctx.db.get(expense.groupId);
      groupName = group?.name ?? "Deleted group";
    }

    // Get all splits with resolved user names
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    const splitDetails = await Promise.all(
      splits.map(async (split) => {
        const user = await ctx.db.get(split.userId);
        return {
          userId: split.userId,
          userName: split.userId === me._id ? "You" : (user?.name ?? "Unknown"),
          paidAmount: split.paidAmount,
          owedAmount: split.owedAmount,
          netAmount: split.paidAmount - split.owedAmount,
        };
      })
    );

    return {
      _id: expense._id,
      description: expense.description,
      totalAmount: expense.totalAmount,
      currency: expense.currency,
      category: expense.category,
      date: expense.date,
      splitMethod: expense.splitMethod,
      notes: expense.notes,
      isSettlement: expense.isSettlement,
      payerName,
      groupName,
      splits: splitDetails,
    };
  },
});

/**
 * Get all expenses for a group, with the current user's involvement.
 */
export const getGroupExpenses = query({
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

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Filter deleted and sort by date desc
    const active = expenses
      .filter((e) => !e.isDeleted)
      .sort((a, b) => b.date - a.date);

    const result = await Promise.all(
      active.map(async (expense) => {
        const payer = await ctx.db.get(expense.paidBy);
        const paidByName =
          expense.paidBy === me._id ? "You" : (payer?.name ?? "Unknown");

        // Get my split for involvement
        const mySplit = await ctx.db
          .query("expenseSplits")
          .withIndex("by_user_expense", (q) =>
            q.eq("userId", me._id).eq("expenseId", expense._id)
          )
          .first();

        let myInvolvement: {
          type: "borrowed" | "lent" | "settled_up" | "not_involved";
          amount: number;
        };

        if (!mySplit) {
          myInvolvement = { type: "not_involved", amount: 0 };
        } else {
          const myNet = mySplit.paidAmount - mySplit.owedAmount;
          if (Math.abs(myNet) < 0.005) {
            myInvolvement = { type: "settled_up", amount: 0 };
          } else if (myNet > 0) {
            myInvolvement = { type: "lent", amount: myNet };
          } else {
            myInvolvement = { type: "borrowed", amount: Math.abs(myNet) };
          }
        }

        return {
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
        };
      })
    );

    return result;
  },
});
