import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Users — active (Clerk-authed) and ghost/invited users
  users: defineTable({
    clerkId: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    defaultCurrency: v.string(),
    avatarUrl: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("invited")),
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"]),

  // 2. Groups — shared context for splitting expenses
  groups: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    defaultCurrency: v.string(),
    avatarUrl: v.optional(v.string()),
    simplifyDebts: v.boolean(),
    type: v.optional(
      v.union(
        v.literal("trip"),
        v.literal("home"),
        v.literal("couple"),
        v.literal("other")
      )
    ),
  }).index("by_createdBy", ["createdBy"]),

  // 3. Group Members — junction table with lifecycle
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("invited"),
      v.literal("joined"),
      v.literal("left")
    ),
    invitedBy: v.id("users"),
    joinedAt: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"])
    .index("by_group_status", ["groupId", "status"]),

  // 4. Expenses — central entity for all monetary events
  expenses: defineTable({
    groupId: v.optional(v.id("groups")),
    paidBy: v.id("users"),
    description: v.string(),
    totalAmount: v.number(),
    currency: v.string(),
    category: v.optional(v.string()),
    date: v.number(),
    createdBy: v.id("users"),
    splitMethod: v.union(
      v.literal("equal"),
      v.literal("exact"),
      v.literal("percentage"),
      v.literal("shares")
    ),
    isSettlement: v.boolean(),
    isMultiPayer: v.boolean(),
    payerCount: v.number(),
    splitCount: v.number(),
    receiptUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    isDeleted: v.optional(v.boolean()),
    deletedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_group_date", ["groupId", "date"])
    .index("by_paidBy", ["paidBy"])
    .index("by_createdBy", ["createdBy"]),

  // 5. Expense Splits — source of truth for balance calculations
  expenseSplits: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    paidAmount: v.number(),
    owedAmount: v.number(),
  })
    .index("by_expense", ["expenseId"])
    .index("by_user", ["userId"])
    .index("by_user_expense", ["userId", "expenseId"]),

  // 6. Balances — precomputed per-context net balance between a user pair
  balances: defineTable({
    user1: v.id("users"),
    user2: v.id("users"),
    groupId: v.optional(v.id("groups")),
    currency: v.string(),
    amount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pair", ["user1", "user2"])
    .index("by_pair_group", ["user1", "user2", "groupId"])
    .index("by_group", ["groupId"])
    .index("by_user1", ["user1"])
    .index("by_user2", ["user2"]),

  // 7. Friend Balances — aggregate balance across all contexts
  friendBalances: defineTable({
    user1: v.id("users"),
    user2: v.id("users"),
    totalAmount: v.number(),
    currency: v.string(),
    lastActivityAt: v.number(),
  })
    .index("by_pair", ["user1", "user2"])
    .index("by_user1", ["user1"])
    .index("by_user2", ["user2"]),

  // 8. Activities — denormalized event log for activity feeds
  activities: defineTable({
    type: v.union(
      v.literal("expense_added"),
      v.literal("expense_updated"),
      v.literal("expense_deleted"),
      v.literal("settlement"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("group_created"),
      v.literal("group_updated")
    ),
    actorId: v.id("users"),
    groupId: v.optional(v.id("groups")),
    expenseId: v.optional(v.id("expenses")),
    involvedUserIds: v.array(v.id("users")),
    metadata: v.object({
      description: v.optional(v.string()),
      totalAmount: v.optional(v.number()),
      currency: v.optional(v.string()),
      paidByName: v.optional(v.string()),
      paidByUserId: v.optional(v.id("users")),
      payerCount: v.optional(v.number()),
      splitCount: v.optional(v.number()),
      memberName: v.optional(v.string()),
      memberUserId: v.optional(v.id("users")),
      settlementToName: v.optional(v.string()),
      settlementToUserId: v.optional(v.id("users")),
    }),
    splitSummary: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          amount: v.number(),
        })
      )
    ),
    createdAt: v.number(),
  })
    .index("by_group_time", ["groupId", "createdAt"])
    .index("by_actor", ["actorId"]),

  // 9. Currencies — exchange rates updated by cron
  currencies: defineTable({
    code: v.string(),
    name: v.string(),
    symbol: v.string(),
    rateToUSD: v.number(),
    lastUpdated: v.number(),
  }).index("by_code", ["code"]),
});
