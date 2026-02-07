# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Splitzer is a real-time expense splitting app (like Splitwise) built on Convex.dev, React + Vite, and Clerk authentication. The detailed build plan is in `build_Plan.md`.

## Commands

```bash
# Install dependencies
npm install

# Start Convex dev server (backend) + Vite dev server (frontend)
npx convex dev    # runs Convex in watch mode
npm run dev       # runs Vite frontend

# Deploy Convex backend
npx convex deploy

# Push schema changes
npx convex dev --once
```

## Architecture

### Stack
- **Backend/Database:** Convex.dev (real-time reactive DB, mutations, queries, cron jobs)
- **Auth:** Clerk (OAuth, email, phone)
- **Frontend:** React + Vite with Convex React hooks
- **Currency Rates:** ExchangeRate API via Convex cron (every 6 hours)

### Three Core Design Principles

1. **Expenses are the source of truth.** Every monetary event (expense or settlement) uses the same `expense` + `expenseSplits` pipeline. Settlements are just expenses with `isSettlement: true`.
2. **Balances are precomputed.** The `balances` table (per-context) and `friendBalances` table (aggregate across all contexts) are updated transactionally on every write, enabling O(1) reads.
3. **Friends are derived, not declared.** No friendships table exists. A "friend" is anyone you share a balance with, derived from `friendBalances`.

### Data Model (9 tables in `convex/schema.ts`)

- **`users`** — Active (Clerk-authed) and ghost/invited users. Ghost users are created when someone is added before signing up; on sign-up, matched by email/phone and patched to active (same `Id<users>` throughout, no data migration).
- **`groups`** — Shared context for splitting expenses. Has `simplifyDebts` toggle.
- **`groupMembers`** — Junction table with lifecycle: invited → joined → left. Left members retained for history.
- **`expenses`** — Central entity for all monetary events. Has denormalized `payerCount`/`splitCount` from `expenseSplits`.
- **`expenseSplits`** — **Source of truth for balances.** One row per person per expense. Invariant: `sum(paidAmount) = sum(owedAmount) = expense.totalAmount`.
- **`balances`** — Precomputed per-context net balance between a canonical user pair (`user1 < user2` by ID). Positive amount = user2 owes user1.
- **`friendBalances`** — Aggregate balance across all contexts for a user pair. Powers the Friends tab.
- **`activities`** — Denormalized event log for activity feeds. Each row self-contained for rendering without joins.
- **`currencies`** — Exchange rates updated by cron. All amounts stored in original currency; conversion at display time only.

### Key Patterns

- **Canonical pair ordering:** `user1 < user2` by string comparison in `balances` and `friendBalances`. Use a `canonicalPair()` helper.
- **Balance update flow:** On every expense write → `updateBalancesForExpense()` → `recalcContextBalance()` (scans all splits for affected pairs in context) → `recalcFriendBalance()` (sums all context balances for the pair).
- **Simplify debts:** Min-cash-flow algorithm runs **on read** (client-side), not stored.
- **Rounding:** Split ₹100/3 = ₹33.33 each, remainder ₹0.01 assigned to first person. Always round to 2 decimal places.
- **Soft deletes:** Expenses use `isDeleted` flag. Balance recalculation excludes deleted expenses.
- **Leaving groups:** Users can only leave if their net group balance is zero.
- **Split methods:** `equal`, `exact`, `percentage`, `shares` — all produce the same `expenseSplits` storage format.
