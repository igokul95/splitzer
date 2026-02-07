# Splitzer — Technical Build Plan & Data Architecture

**Stack:** Convex.dev · React · Clerk Auth
**Date:** February 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model — Schema Reference (9 Tables)](#2-data-model--schema-reference-9-tables)
3. [Feature Specifications](#3-feature-specifications)
   - 3.1 User Management & Ghost Users
   - 3.2 Groups & Membership
   - 3.3 Expenses & Splits
   - 3.4 Settlements (Settle Up)
   - 3.5 Balance Computation Engine
   - 3.6 Friends Tab (Derived Friends)
   - 3.7 Group Activity Feed
   - 3.8 Currency Conversion
4. [Core Mutation Logic & Code Samples](#4-core-mutation-logic--code-samples)
5. [Query Patterns & Indexes](#5-query-patterns--indexes)
6. [Edge Cases & Considerations](#7-edge-cases--considerations)

---

## 1. Architecture Overview

Splitzer is built on a reactive, real-time architecture using Convex as the backend-as-a-service platform. The data model follows three core design principles:

- **Expenses are the source of truth.** Every monetary event (expense or settlement) flows through the same expense + expenseSplits pipeline.
- **Balances are precomputed.** Per-context balances (`balances` table) and friend-level aggregates (`friendBalances` table) are updated transactionally on every write, enabling O(1) reads.
- **Friends are derived, not declared.** There is no friendships table. A "friend" is anyone you share a balance with, derived from the `friendBalances` table.

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend / Database | Convex.dev | Real-time reactive DB, mutations, queries, cron jobs |
| Authentication | Clerk | User sign-up/sign-in, OAuth, phone auth |
| Frontend (Web) | React + Vite | Web client with Convex React hooks |
| Currency Rates | ExchangeRate API | Periodic rate fetching via Convex cron |

---

## 2. Data Model — Schema Reference (9 Tables)

The complete schema is defined in `convex/schema.ts`. Below is a summary of each table, its purpose, fields, and indexes.

### 2.1 `users`

Stores both active (signed-up) and invited (ghost) users. Ghost users are created when someone is added to a group or expense before they sign up. On sign-up, matched by email or phone, `clerkId` is set, and status flips to `"active"`.

| Field | Type | Description |
|-------|------|-------------|
| `clerkId` | `string` (optional) | Auth provider ID. Null for ghost users. |
| `name` | `string` | Display name (set by inviter for ghosts) |
| `email` | `string` (optional) | Email address, used for ghost-to-active matching |
| `phone` | `string` (optional) | Phone number, used for ghost-to-active matching |
| `defaultCurrency` | `string` | User's preferred currency code (INR, USD) |
| `avatarUrl` | `string` (optional) | Profile image URL |
| `status` | `"active" \| "invited"` | active = signed up, invited = ghost |
| `invitedBy` | `Id<users>` (optional) | Who created this ghost user |

**Indexes:** `by_clerkId`, `by_email`, `by_phone`, `by_status`

### 2.2 `groups`

Represents a shared context for splitting expenses (trips, households, couples, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Group name |
| `createdBy` | `Id<users>` | Group creator |
| `defaultCurrency` | `string` | Default currency for new expenses |
| `avatarUrl` | `string` (optional) | Group image |
| `simplifyDebts` | `boolean` | Enable min-cash-flow debt simplification |
| `type` | `"trip" \| "home" \| "couple" \| "other"` (optional) | Group category |

**Indexes:** `by_createdBy`

### 2.3 `groupMembers`

Junction table tracking membership lifecycle. Members with status `"left"` are retained for historical expense attribution.

| Field | Type | Description |
|-------|------|-------------|
| `groupId` | `Id<groups>` | Reference to group |
| `userId` | `Id<users>` | Reference to user (can be ghost) |
| `role` | `"admin" \| "member"` | Permission level |
| `status` | `"invited" \| "joined" \| "left"` | Membership lifecycle state |
| `invitedBy` | `Id<users>` | Who added this member |
| `joinedAt` | `number` (optional) | Timestamp when they joined (null if still invited) |

**Indexes:** `by_group`, `by_user`, `by_group_user`, `by_group_status`

### 2.4 `expenses`

Central entity for all monetary events. Covers group expenses, direct (non-group) expenses, and settlements. The `paidBy`, `payerCount`, and `splitCount` fields are denormalized from `expenseSplits` for fast list rendering.

| Field | Type | Description |
|-------|------|-------------|
| `groupId` | `Id<groups>` (optional) | Null for direct (non-group) expenses |
| `paidBy` | `Id<users>` | Primary payer for display |
| `description` | `string` | What the expense was for |
| `totalAmount` | `number` | Total amount in the specified currency |
| `currency` | `string` | Currency code |
| `category` | `string` (optional) | food, transport, rent, etc. |
| `date` | `number` | User-chosen date (ms timestamp) |
| `createdBy` | `Id<users>` | Who recorded this expense |
| `splitMethod` | `"equal" \| "exact" \| "percentage" \| "shares"` | How the expense is divided |
| `isSettlement` | `boolean` | True if this is a payment between users |
| `isMultiPayer` | `boolean` | True if more than one person paid |
| `payerCount` | `number` | Number of payers (for summary display) |
| `splitCount` | `number` | Total people involved in the split |
| `receiptUrl` | `string` (optional) | Uploaded receipt image |
| `notes` | `string` (optional) | Additional notes |
| `isDeleted` | `boolean` (optional) | Soft delete flag |
| `deletedBy` | `Id<users>` (optional) | Who deleted the expense |
| `deletedAt` | `number` (optional) | Deletion timestamp |

**Indexes:** `by_group`, `by_group_date`, `by_paidBy`, `by_createdBy`

### 2.5 `expenseSplits`

**The source of truth** for all balance calculations. One row per person per expense.

**Invariant:** For any expense, `sum(paidAmount) = sum(owedAmount) = expense.totalAmount`. The net for each user is `paidAmount - owedAmount` (positive means others owe them).

| Field | Type | Description |
|-------|------|-------------|
| `expenseId` | `Id<expenses>` | Parent expense |
| `userId` | `Id<users>` | The user this split belongs to |
| `paidAmount` | `number` | How much this user actually paid (0 for non-payers) |
| `owedAmount` | `number` | This user's share of the expense |

**Indexes:** `by_expense`, `by_user`, `by_user_expense`

### 2.6 `balances` (Precomputed, per-context)

Stores the net balance between a user pair within a specific context. Canonical ordering: `user1 < user2` by ID string comparison. Positive amount means user2 owes user1.

| Field | Type | Description |
|-------|------|-------------|
| `user1` | `Id<users>` | Smaller ID (canonical) |
| `user2` | `Id<users>` | Larger ID (canonical) |
| `groupId` | `Id<groups>` (optional) | Undefined for non-group balances |
| `currency` | `string` | Currency code |
| `amount` | `number` | Net amount (positive = user2 owes user1) |
| `updatedAt` | `number` | Last update timestamp |

**Indexes:** `by_pair`, `by_pair_group`, `by_group`, `by_user1`, `by_user2`

### 2.7 `friendBalances` (Precomputed aggregate)

Overall net balance between two users across ALL contexts (all groups + non-group). Powers the Friends tab with O(1) per-friend reads. Updated in the same mutation that updates `balances`.

| Field | Type | Description |
|-------|------|-------------|
| `user1` | `Id<users>` | Smaller ID |
| `user2` | `Id<users>` | Larger ID |
| `totalAmount` | `number` | Net across all contexts |
| `currency` | `string` | Primary currency |
| `lastActivityAt` | `number` | For sorting and hidden/visible logic |

**Indexes:** `by_pair`, `by_user1`, `by_user2`

### 2.8 `activities`

Denormalized event log for rendering activity feeds. Each row contains enough metadata to render a feed item without additional queries.

| Field | Type | Description |
|-------|------|-------------|
| `type` | union of event types | `expense_added`, `settlement`, `member_added`, etc. |
| `actorId` | `Id<users>` | Who performed the action |
| `groupId` | `Id<groups>` (optional) | Group context |
| `expenseId` | `Id<expenses>` (optional) | Related expense |
| `involvedUserIds` | `Id<users>[]` | All users involved (for filtering) |
| `metadata` | `object` | Pre-rendered: description, amount, payer name, etc. |
| `splitSummary` | `array` (optional) | Per-user amounts for personalized context |
| `createdAt` | `number` | Event timestamp |

**Indexes:** `by_group_time`, `by_actor`

### 2.9 `currencies`

Reference table for exchange rates, updated periodically via a Convex cron job.

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Currency code (USD, INR, EUR) |
| `name` | `string` | Full name |
| `symbol` | `string` | Display symbol |
| `rateToUSD` | `number` | How many units per 1 USD |
| `lastUpdated` | `number` | Last rate update timestamp |

**Indexes:** `by_code`

---

## 3. Feature Specifications

### 3.1 User Management & Ghost Users

The app supports two user states: **active** (signed up with Clerk) and **invited** (ghost). Ghost users enable adding people to groups and expenses before they install the app.

#### Ghost User Creation Flow

1. User A adds "Gokul (gokul@email.com)" to a group.
2. System checks `users` table for matching email. If not found, creates a ghost user with `status: "invited"`, `clerkId: undefined`.
3. Ghost user gets a real `Id<users>`, can appear in `expenseSplits`, `balances`, and `friendBalances`.
4. All expense logic works identically for ghost and active users.

#### Ghost-to-Active Merge Flow

1. Gokul signs up via Clerk with gokul@email.com.
2. In the Clerk webhook handler (or on first login), query `users.by_email` for the email.
3. If a ghost user is found: patch the existing document with `clerkId` and `status: "active"`.
4. No data migration needed since the same `Id<users>` was used throughout.

#### Code Sample: Ghost User Creation

```typescript
export const getOrCreateUser = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    invitedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (existing) return existing._id;
    }
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      status: "invited",
      defaultCurrency: "INR",
      invitedBy: args.invitedBy,
    });
  },
});
```

---

### 3.2 Groups & Membership

Groups are the primary organizational unit. The membership lifecycle is: **invited** (added by someone) → **joined** (opened the group / accepted) → **left** (voluntarily left or removed).

#### Create Group Flow

1. Creator provides: name, type, default currency, member list (names + emails/phones).
2. System creates the group, then for each member: `getOrCreateUser` (creates ghosts if needed), then inserts a `groupMembers` row.
3. Creator gets `role: "admin"`, `status: "joined"`. Others get `role: "member"`, `status: "invited"`.

#### Key Queries

- **My groups:** Query `groupMembers.by_user` where `userId = me` and `status != "left"`, then fetch each group.
- **Group members:** Query `groupMembers.by_group_status` where `groupId = X` and `status = "joined"`.
- **All members (including left):** Query `groupMembers.by_group` for historical views.

---

### 3.3 Expenses & Splits

Every expense follows the same pipeline regardless of split method. The split method determines HOW `owedAmount` is calculated, but the storage format is always identical.

#### Split Method Calculations

| Method | owedAmount Calculation | Example (₹600, 3 people) |
|--------|----------------------|--------------------------|
| `equal` | `totalAmount / splitCount` | ₹200 each |
| `exact` | User-specified amounts (must sum to total) | ₹100, ₹200, ₹300 |
| `percentage` | `totalAmount × (percentage / 100)` | 20%, 30%, 50% |
| `shares` | `totalAmount × (myShares / totalShares)` | 1:2:3 shares |

#### Add Expense Mutation (Pseudocode)

```typescript
export const addExpense = mutation({
  args: {
    groupId, paidBy, description, totalAmount, currency,
    splitMethod, splits: [{ userId, paidAmount, owedAmount }],
    category, date, notes,
  },
  handler: async (ctx, args) => {
    // 1. Validate: sum(paidAmount) == sum(owedAmount) == totalAmount
    // 2. Insert expense row (with denormalized payerCount, splitCount)
    // 3. Insert expenseSplit rows (one per person)
    // 4. Update per-context balances (see Section 3.5)
    // 5. Update friendBalances aggregates
    // 6. Insert activity log entry
  },
});
```

#### Multi-Payer Example

Alice pays ₹300 and Bob pays ₹200 for a ₹500 dinner split 5 ways equally:

| User | paidAmount | owedAmount | Net (paid − owed) |
|------|-----------|-----------|-------------------|
| Alice | 300 | 100 | +200 (others owe her) |
| Bob | 200 | 100 | +100 (others owe him) |
| Carol | 0 | 100 | −100 (she owes) |
| Dave | 0 | 100 | −100 (he owes) |
| Eve | 0 | 100 | −100 (she owes) |

**Display summary:** `payerCount = 2`, `splitCount = 5`. UI shows "2 people paid ₹500 · split 5 ways".

---

### 3.4 Settlements (Settle Up)

A settlement is a special expense where one user pays another to reduce their debt. It uses the exact same expense + expenseSplits pipeline, keeping the model uniform.

#### Settlement Data Shape

```typescript
// Expense row:
{
  isSettlement: true,
  paidBy: payerId,
  totalAmount: 100,
  description: "Settlement",
  payerCount: 1,
  splitCount: 2,
}

// Two splits:
{ userId: payer, paidAmount: 100, owedAmount: 0 }
{ userId: payee, paidAmount: 0, owedAmount: 100 }
```

This creates a net of +100 for the payer and −100 for the payee, which offsets existing debt when the balance is recalculated.

#### Settle Up Flow

1. User views their balance with another user (e.g., "You owe Gokul ₹250").
2. Taps "Settle Up". App pre-fills the amount (₹250) but allows partial settlement.
3. On confirm: `addExpense` is called with `isSettlement: true`.
4. Balance updates propagate to `balances`, `friendBalances`, and `activities` in one transaction.

#### Code Sample: settleUp Mutation

```typescript
export const settleUp = mutation({
  args: {
    payerId: v.id("users"),
    payeeId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    // 1. Create expense with isSettlement: true
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      paidBy: args.payerId,
      description: "Settlement",
      totalAmount: args.amount,
      currency: args.currency,
      splitMethod: "exact",
      isSettlement: true,
      isMultiPayer: false,
      payerCount: 1,
      splitCount: 2,
      createdBy: args.payerId,
      date: Date.now(),
    });

    // 2. Two splits: payer paid full, payee owes full
    await ctx.db.insert("expenseSplits", {
      expenseId,
      userId: args.payerId,
      paidAmount: args.amount,
      owedAmount: 0,
    });
    await ctx.db.insert("expenseSplits", {
      expenseId,
      userId: args.payeeId,
      paidAmount: 0,
      owedAmount: args.amount,
    });

    // 3. Update balances + friendBalances
    await updateBalancesForExpense(ctx, args.groupId, args.currency, [
      { userId: args.payerId, paidAmount: args.amount, owedAmount: 0 },
      { userId: args.payeeId, paidAmount: 0, owedAmount: args.amount },
    ]);

    // 4. Log activity
    const payer = await ctx.db.get(args.payerId);
    const payee = await ctx.db.get(args.payeeId);
    await ctx.db.insert("activities", {
      type: "settlement",
      actorId: args.payerId,
      groupId: args.groupId,
      expenseId,
      involvedUserIds: [args.payerId, args.payeeId],
      metadata: {
        totalAmount: args.amount,
        currency: args.currency,
        paidByName: payer?.name,
        paidByUserId: args.payerId,
        payerCount: 1,
        splitCount: 2,
        settlementToName: payee?.name,
        settlementToUserId: args.payeeId,
      },
      splitSummary: [
        { userId: args.payerId, amount: args.amount },
        { userId: args.payeeId, amount: -args.amount },
      ],
      createdAt: Date.now(),
    });

    return expenseId;
  },
});
```

---

### 3.5 Balance Computation Engine

Balances are precomputed at two levels and updated transactionally on every expense write (create, edit, delete).

#### Level 1: Per-Context Balances (`balances` table)

One row per `(user1, user2, groupId, currency)` tuple. Updated by scanning all `expenseSplits` for the affected user pairs within the context.

#### Level 2: Friend-Level Aggregates (`friendBalances` table)

One row per unique user pair. The `totalAmount` is the sum of all per-context balance amounts between those two users. Updated by summing all rows from the `balances` table for the pair.

#### Canonical Pair Helper

```typescript
function canonicalPair(
  a: Id<"users">,
  b: Id<"users">
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}
```

#### Balance Update Logic (Core Function)

```typescript
async function updateBalancesForExpense(
  ctx: MutationCtx,
  groupId: Id<"groups"> | undefined,
  currency: string,
  splits: { userId: Id<"users">; paidAmount: number; owedAmount: number }[]
) {
  const userIds = splits.map((s) => s.userId);
  const uniquePairs: [Id<"users">, Id<"users">][] = [];

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const [u1, u2] = canonicalPair(userIds[i], userIds[j]);
      if (!uniquePairs.find((p) => p[0] === u1 && p[1] === u2)) {
        uniquePairs.push([u1, u2]);
      }
    }
  }

  for (const [u1, u2] of uniquePairs) {
    await recalcContextBalance(ctx, u1, u2, groupId, currency);
    await recalcFriendBalance(ctx, u1, u2);
  }
}
```

#### recalcContextBalance

```typescript
async function recalcContextBalance(
  ctx: MutationCtx,
  user1: Id<"users">,
  user2: Id<"users">,
  groupId: Id<"groups"> | undefined,
  currency: string
) {
  // Get ALL expenses in this context
  const expenses = groupId
    ? await ctx.db
        .query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect()
    : await getAllNonGroupExpensesBetween(ctx, user1, user2);

  let net = 0;
  for (const exp of expenses) {
    if (exp.isDeleted) continue;
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", exp._id))
      .collect();

    const s1 = splits.find((s) => s.userId === user1);
    const s2 = splits.find((s) => s.userId === user2);
    if (s1) net += s1.paidAmount - s1.owedAmount;
    // net tracks user1's position relative to user2
  }

  // Upsert the balance row
  const existing = await ctx.db
    .query("balances")
    .withIndex("by_pair_group", (q) =>
      q.eq("user1", user1).eq("user2", user2).eq("groupId", groupId)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      amount: net,
      updatedAt: Date.now(),
    });
  } else if (net !== 0) {
    await ctx.db.insert("balances", {
      user1,
      user2,
      groupId,
      currency,
      amount: net,
      updatedAt: Date.now(),
    });
  }
}
```

#### recalcFriendBalance

```typescript
async function recalcFriendBalance(
  ctx: MutationCtx,
  user1: Id<"users">,
  user2: Id<"users">
) {
  // Sum ALL balances between these two across all contexts
  const allBalances = await ctx.db
    .query("balances")
    .withIndex("by_pair", (q) => q.eq("user1", user1).eq("user2", user2))
    .collect();

  const total = allBalances.reduce((sum, b) => sum + b.amount, 0);

  const existing = await ctx.db
    .query("friendBalances")
    .withIndex("by_pair", (q) => q.eq("user1", user1).eq("user2", user2))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalAmount: total,
      lastActivityAt: Date.now(),
    });
  } else {
    await ctx.db.insert("friendBalances", {
      user1,
      user2,
      totalAmount: total,
      currency: allBalances[0]?.currency ?? "INR",
      lastActivityAt: Date.now(),
    });
  }
}
```

#### Simplify Debts Algorithm

When a group has `simplifyDebts` enabled, the UI runs a min-cash-flow algorithm **on read** (not stored). The algorithm computes each member's net balance within the group, then greedily matches the largest creditor with the largest debtor to minimize total transactions.

---

### 3.6 Friends Tab (Derived Friends)

**Core principle:** A "friend" is anyone you share a balance with. There is no friendships table. The `friendBalances` table is the single source for the Friends tab.

#### Visible vs Hidden Logic

| Category | Condition | Display |
|----------|-----------|---------|
| Active balance | `totalAmount != 0` | Always visible, sorted by `abs(amount)` desc |
| Recently settled | `totalAmount == 0` AND `lastActivityAt` < 7 days ago | Visible in main list |
| Hidden | `totalAmount == 0` AND `lastActivityAt` >= 7 days ago | Behind "Show N hidden friends" button |

#### Friends Tab Query

```typescript
export const getMyFriends = query({
  handler: async (ctx) => {
    const me = await getAuthUser(ctx);

    const asUser1 = await ctx.db
      .query("friendBalances")
      .withIndex("by_user1", (q) => q.eq("user1", me._id))
      .collect();

    const asUser2 = await ctx.db
      .query("friendBalances")
      .withIndex("by_user2", (q) => q.eq("user2", me._id))
      .collect();

    const friends = [...asUser1, ...asUser2].map((fb) => {
      const friendId = fb.user1 === me._id ? fb.user2 : fb.user1;
      const net = fb.user1 === me._id ? fb.totalAmount : -fb.totalAmount;
      return { friendId, net, lastActivityAt: fb.lastActivityAt };
    });

    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return {
      visible: friends.filter(
        (f) => f.net !== 0 || now - f.lastActivityAt < ONE_WEEK
      ),
      hidden: friends.filter(
        (f) => f.net === 0 && now - f.lastActivityAt >= ONE_WEEK
      ),
    };
  },
});
```

#### Display States Per Friend

| net value | Label | Color |
|-----------|-------|-------|
| Positive (> 0) | "owes you ₹X" | Green |
| Negative (< 0) | "you owe ₹X" | Red/Orange |
| Zero (= 0) | "settled up" | Grey |

#### Friends Tab UI Layout

```
┌──────────────────────────────────┐
│  FRIENDS                         │
│                                  │
│  👤 Gokul        owes you ₹250  │  ← active balance
│  👤 Ajo          you owe ₹100   │  ← active balance
│  👤 Gary         settled up     │  ← settled < 1 week ago
│                                  │
│  ┌──────────────────────────┐   │
│  │ Show 4 hidden friends    │   │  ← settled > 1 week ago
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

---

### 3.7 Group Activity Feed

The activity feed shows all events within a group, ordered by time, grouped by month on the client side. Each activity includes personalized context for the current viewer.

#### Feed Rendering Logic

| Activity Type | Rendered Text |
|--------------|---------------|
| `expense_added` (not involved) | Fuel to Tvm — *you were not involved* |
| `expense_added` (you borrowed) | Lunch — Ajo paid ₹200, *you borrowed ₹50* |
| `expense_added` (you lent) | Dinner — *you paid ₹600, you lent ₹400* |
| `settlement` | Gary paid Gokul ₹100 |
| `member_added` | Ajo added Gokul to the group |
| `member_removed` | Gary left the group |

#### Personalization Logic

```typescript
function getMyInvolvement(
  activity: Activity,
  myId: Id<"users">
): { type: "not_involved" } | { type: "borrowed" | "lent"; amount: number } {
  if (!activity.involvedUserIds.includes(myId)) {
    return { type: "not_involved" };
  }

  const mySplit = activity.splitSummary?.find((s) => s.userId === myId);
  if (!mySplit) return { type: "not_involved" };

  if (mySplit.amount < 0) {
    return { type: "borrowed", amount: Math.abs(mySplit.amount) };
  }
  return { type: "lent", amount: mySplit.amount };
}
```

#### Month Grouping (Client-Side)

Activities are returned sorted by `createdAt` descending. The client groups them by month-year using the timestamp. This avoids server-side aggregation and works naturally with Convex pagination.

```typescript
// Client-side: group by month for section headers
const grouped: Record<string, Activity[]> = {};
activities.forEach((a) => {
  const key = new Date(a.createdAt).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
  (grouped[key] ||= []).push(a);
});
```

---

### 3.8 Currency Conversion

**Storage principle:** All amounts are stored in their original currency. The `balances` table is per-currency per pair. Conversion happens only at display time.

#### Rate Update Cron Job

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();
crons.interval(
  "update exchange rates",
  { hours: 6 },
  internal.currencies.updateRates
);
export default crons;
```

#### Display-Time Conversion

When showing a combined total across multiple currencies (e.g., "Overall, you are owed $120"), convert each balance to the user's `defaultCurrency` using the latest `rateToUSD` values.

```typescript
function convertToUserCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, { rateToUSD: number }>
): number {
  if (fromCode === toCode) return amount;
  const fromRate = rates[fromCode].rateToUSD;
  const toRate = rates[toCode].rateToUSD;
  return (amount / fromRate) * toRate;
}
```

---

## 4. Core Mutation Logic & Code Samples

### addExpense — Full Implementation

```typescript
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

    // --- Validation ---
    const totalPaid = args.splits.reduce((s, x) => s + x.paidAmount, 0);
    const totalOwed = args.splits.reduce((s, x) => s + x.owedAmount, 0);
    if (Math.abs(totalPaid - args.totalAmount) > 0.01)
      throw new Error("Paid amounts must equal total");
    if (Math.abs(totalOwed - args.totalAmount) > 0.01)
      throw new Error("Owed amounts must equal total");

    // --- Denormalized fields ---
    const payers = args.splits.filter((s) => s.paidAmount > 0);
    const payerCount = payers.length;
    const splitCount = args.splits.length;

    // --- 1. Insert expense ---
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

    // --- 2. Insert splits ---
    for (const split of args.splits) {
      await ctx.db.insert("expenseSplits", {
        expenseId,
        userId: split.userId,
        paidAmount: split.paidAmount,
        owedAmount: split.owedAmount,
      });
    }

    // --- 3. Update balances ---
    await updateBalancesForExpense(
      ctx,
      args.groupId,
      args.currency,
      args.splits
    );

    // --- 4. Log activity ---
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
        paidByName: payer?.name,
        paidByUserId: args.paidBy,
        payerCount,
        splitCount,
      },
      splitSummary: args.splits.map((s) => ({
        userId: s.userId,
        amount: s.paidAmount - s.owedAmount,
      })),
      createdAt: Date.now(),
    });

    return expenseId;
  },
});
```

---

## 5. Query Patterns & Indexes

| User Action | Query Pattern | Index Used |
|-------------|--------------|------------|
| Open Friends tab | `friendBalances` where `user1=me` OR `user2=me` | `by_user1`, `by_user2` |
| View balance with one friend | `balances` where `user1,user2` = canonical pair | `by_pair` |
| Open a group | `groupMembers.by_group` + `balances.by_group` | `by_group` (both tables) |
| View group expenses | `expenses.by_group_date`, paginated desc | `by_group_date` |
| View expense detail | expense by ID + `expenseSplits.by_expense` | `by_expense` |
| Group activity feed | `activities.by_group_time`, paginated desc | `by_group_time` |
| My activity (all groups) | `activities.by_actor`, paginated desc | `by_actor` |
| My groups list | `groupMembers.by_user` where `status != "left"` | `by_user` |
| Settle up preview | `balances.by_pair_group` for specific pair | `by_pair_group` |
| Group balance summary | `balances.by_group`, filter for me | `by_group` |

---

## 6. Edge Cases & Considerations

### Rounding Errors

When splitting ₹100 three ways, each share is ₹33.33, totaling ₹99.99. The remaining ₹0.01 should be assigned to the expense creator or first person in the split list. Always round to 2 decimal places and adjust the last person's share to make the sum exact.

### Editing Expenses

When an expense is edited (amount changed, people added/removed), the balance update logic must recalculate from scratch for all affected pairs. This is why `recalcContextBalance` scans all splits between a pair, not just the delta.

### Deleting Expenses

Soft delete (`isDeleted: true`) is preferred. The balance recalculation automatically excludes deleted expenses. An activity with type `"expense_deleted"` is logged.

### Leaving a Group

A user can only leave a group if their net balance within the group is zero. If they have outstanding debts, they must settle up first. The `groupMembers` status is set to `"left"` but the row is retained for historical data.

### Ghost User Conflicts

If the same person is invited via different emails across groups, multiple ghost users may exist. On sign-up, the merge logic should check all provided identifiers (email, phone) and merge all matching ghosts. This requires updating all references in `expenseSplits`, `balances`, `friendBalances`, `groupMembers`, and `activities`.

### Currency Edge Cases

If two users have balances in multiple currencies (e.g., ₹100 in INR and $5 in USD), the `balances` table stores separate rows per currency. The `friendBalances` table stores the combined total in the primary currency (the most frequently used one between the pair). The Friends tab converts all to the viewer's `defaultCurrency` at display time.

### Convex Transaction Limits

Convex mutations have limits on reads and writes per transaction. For large groups (20+ members), the balance update step may hit limits. Mitigation: use Convex internal functions and scheduled actions to batch balance updates if needed, or optimize by only recalculating pairs where at least one user's split changed.
