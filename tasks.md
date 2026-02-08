# Splitzer — Task Tracker

## Phase 1: Project Setup, Auth & Base UI

### 1. Project Scaffolding
- [x] Initialize React + Vite + TypeScript project
- [x] Install and init Convex (`convex`)
- [x] Install Clerk (`@clerk/clerk-react`)
- [x] Install and configure Tailwind CSS
- [x] Install and configure shadcn/ui
- [x] Install React Router v7
- [x] Set up env variables (`.env.local`)
- [x] Create mobile-first layout shell (`MobileShell.tsx` — max-width container centered on desktop, full-bleed on mobile, iOS-style safe area padding)

### 2. Convex Schema
- [x] Define full schema in `convex/schema.ts` — all 9 tables with indexes per build_Plan.md

### 3. Convex + Clerk Auth Integration
- [x] Configure `convex/auth.config.ts` for Clerk
- [x] Set up `ClerkProvider` + `ConvexProviderWithClerk` in `App.tsx`

### 4. User Management (Backend — `convex/users.ts`)
- [x] `users.getViewer` — query: return the current authenticated user by Clerk identity
- [x] `users.findOrCreateByContact` — mutation: look up user by email/phone, create ghost if not found
- [x] `users.syncCurrentUser` — mutation: called on first login; creates active user record or merges an existing ghost (match by email/phone, patch in clerkId + status "active")

### 5. Auth UI Screens
- [x] Create `SignInPage.tsx` with Clerk `<SignIn />` component
- [x] Create `SignUpPage.tsx` with Clerk `<SignUp />` component
- [x] Set up React Router with public routes (`/sign-in`, `/sign-up`) and protected routes (`/`)
- [x] Create `HomePage.tsx` — authenticated placeholder with user name + sign-out button
- [x] Call `users.syncCurrentUser` on authenticated app mount to ensure user record exists

### Verification (requires interactive terminal)
- [ ] Run `npx convex login` then `npx convex dev` — starts without schema errors
- [ ] Run `npx convex env set CLERK_ISSUER_URL "https://secure-cheetah-70.clerk.accounts.dev"`
- [ ] `npm run dev` serves the Vite app
- [ ] Sign up → creates user in Convex `users` table with `status: "active"` and `clerkId` set
- [ ] Sign in → redirects to authenticated home screen
- [ ] Unauthenticated access → redirects to `/sign-in`
- [ ] UI renders mobile-first, centered on desktop

---

## Phase 2: Groups & Members

### 1. Shared Utilities (Backend)
- [x] Create `convex/helpers.ts` with `getAuthUser()` and `canonicalPair()` shared utilities

### 2. Group Backend (`convex/groups.ts`)
- [x] `groups.getMyGroups` — query: returns all groups for current user with per-group balances and overall summary
- [x] `groups.getGroup` — query: returns single group with members, balances, and all pairwise balance details
- [x] `groups.getGroupMembers` — query: returns all members (including left) with user details
- [x] `groups.getKnownContacts` — query: returns people user has been in groups with, excluding current group members (for Add Members view)
- [x] `groups.createGroup` — mutation: creates group with name + type only, adds creator as admin, logs activity (members added separately)
- [x] `groups.updateGroup` — mutation: updates group name, type, currency, simplifyDebts
- [x] `groups.addMember` — mutation: adds member to existing group (find or create user), logs activity
- [x] `groups.removeMember` — mutation: removes member (admin only, zero balance check), logs activity
- [x] `groups.leaveGroup` — mutation: current user leaves (zero balance check), logs activity
- [x] `groups.deleteGroup` — mutation: admin-only delete (all balances must be zero)

### 3. App Shell & Navigation
- [x] Create `BottomNav.tsx` — fixed bottom nav with Friends, Groups, Activity, Account tabs
- [x] Update `MobileShell.tsx` — accept `hideNav` prop, integrate BottomNav
- [x] Overhaul `App.tsx` routing — `/groups`, `/groups/create`, `/groups/:id`, `/groups/:id/settings`, `/friends`, `/activity`, `/account`

### 4. Formatting Helpers
- [x] Create `src/lib/format.ts` — `formatCurrency()`, `SUPPORTED_CURRENCIES`, `GROUP_TYPE_CONFIG`

### 5. shadcn/ui Components
- [x] Install: avatar, input, label, card, badge, separator, dialog, sheet, switch, select, scroll-area, tabs, textarea, dropdown-menu, tooltip

### 6. Groups List UI
- [x] Create `GroupsPage.tsx` — overall balance banner, group list with search + create link, empty state, loading skeleton
- [x] Create `GroupCard.tsx` — group type icon, name, balance status, per-member balance summaries

### 7. Create Group UI
- [x] Create `CreateGroupPage.tsx` — simplified form with name + type selector only (members added post-creation)

### 8. Group Detail UI
- [x] Create `GroupHeader.tsx` — teal hero header with back button, settings, name, member count badge
- [x] Create `BalanceSummary.tsx` — balance bar showing who owes whom
- [x] Create `GroupTabs.tsx` — tab pills (Settle up, Expenses, Balances, Totals) with content for each
- [x] Create `GroupDetailPage.tsx` — assembles header, balance, tabs, and FAB for "Add expense"
- [x] Solo member empty state — "You're the only one here!" card with "Add members" + "Share a link" buttons

### 9. Add Members Flow
- [x] Create `AddMembersPage.tsx` — search bar, "Add a new contact" link, known contacts list with multi-select checkboxes, floating confirm button
- [x] Create `AddContactPage.tsx` — name + email/phone form, reassurance text, calls addMember mutation
- [x] Add routes `/groups/:id/add-members` and `/groups/:id/add-contact` to `App.tsx`

### 10. Group Settings UI
- [x] Create `GroupSettingsPage.tsx` — edit name/type/currency/simplifyDebts, member list with add/remove, leave group, delete group (with confirmation dialogs)

### 11. UI Refinements
- [x] Remove filter icon (SlidersHorizontal) from Groups list OverallBalance banner
- [x] Add `groups.getAllKnownContacts` backend query (no groupId needed, for Create Group flow)
- [x] Create `CreateAddMembersPage` — full-screen add-members for create flow (uses `getAllKnownContacts`, returns selections via navigation state)
- [x] Create `CreateAddContactPage` — full-screen add-contact for create flow (collects name/phone/email, returns via navigation state)
- [x] Rewrite `CreateGroupPage` — Members section showing You + pending members; "Add members" navigates to full-screen `CreateAddMembersPage`; form state preserved via `location.state`; group + members only created on submit
- [x] Update `AddMembersPage` and `AddContactPage` — support `returnTo` in `location.state` so they navigate back to settings (not group detail) when called from Group Settings
- [x] Update `GroupSettingsPage` — "Add members" navigates to full-screen `AddMembersPage` with `returnTo: settings`; returns to settings after adding
- [x] Add routes `/groups/create/add-members` and `/groups/create/add-contact` to `App.tsx`

### 12. Placeholder & Utility Pages
- [x] Create `FriendsPage.tsx` — placeholder with empty state
- [x] Create `ActivityPage.tsx` — placeholder with empty state
- [x] Create `AccountPage.tsx` — user profile, email, default currency, sign out button
- [x] Remove old `HomePage.tsx` (replaced by GroupsPage)

### 13. Friends Section
- [x] Create `convex/friends.ts` — `getMyFriends` query (friend list with per-currency overall balances, per-group breakdowns, visible/hidden split) and `getFriendDetail` query (friend info, per-group breakdowns, shared expense timeline)
- [x] Create `FriendCard.tsx` — avatar (image or initials), name, balance label (owes you / you owe / settled up), expandable per-group breakdowns
- [x] Rewrite `FriendsPage.tsx` — header with search + "Add friends", multi-currency overall balance banner, friend list, "Show N hidden friends" toggle, empty state, loading skeleton
- [x] Create `FriendHeader.tsx` — teal gradient hero header with back button, settings, large avatar, friend name, balance summary
- [x] Create `FriendDetailPage.tsx` — hero header, action button row (Settle up, Remind, Charts, Convert to), expense timeline grouped by month, empty state
- [x] Add `/friends/:id` route to `App.tsx`

## Phase 3: Expenses & Splits

### 1. Split Computation Library (`src/lib/splits.ts`)
- [x] `computeEqualSplit` — divides total equally among included participants, handles remainder
- [x] `computeExactSplit` — user-specified exact amounts per person
- [x] `computePercentageSplit` — percentage-based splits (must sum to 100%)
- [x] `computeSharesSplit` — share-ratio based splits
- [x] Remainder distribution logic (rounding to 2 decimal places)

### 2. Expense Backend (`convex/expenses.ts`)
- [x] `expenses.addExpense` — mutation: creates expense + expenseSplits, validates totals, updates balances, logs activity
- [x] `expenses.deleteExpense` — mutation: soft-deletes expense, recalculates balances, logs activity
- [x] `expenses.getGroupExpenses` — query: returns all expenses for a group with user involvement info (lent/borrowed/settled)

### 3. Add Expense UI (`src/pages/AddExpensePage.tsx`)
- [x] Full expense creation form: description, amount, currency, category, date, notes
- [x] Payer selection sheet (single payer)
- [x] Split method selector (Equal / Exact / Percentage / Shares) with interactive panels
- [x] Category picker with icons (General, Food, Transport, Housing, Utilities, Entertainment, Shopping)
- [x] Context-aware: works with group (loads members) or friend (2-person list)
- [x] Friend/group selection screen when opened without context (Recent friends + Groups list with search)

### 4. Expense Row Component (`src/components/expenses/ExpenseRow.tsx`)
- [x] Displays expense with date, category icon, description, payer info
- [x] Color-coded involvement labels (you lent / you borrowed / settled up)
- [x] Reusable across group detail and friend detail pages

### 5. Route
- [x] Add `/expenses/add` route to `App.tsx`

---

## Phase 4: Balances & Settlements

### 1. Balance Engine (`convex/balances.ts`)
- [x] `updateBalancesForExpense` — updates all affected user pairs after expense write/delete
- [x] `recalcContextBalance` — recalculates balance between two users in a specific context (group or non-group)
- [x] `recalcFriendBalance` — aggregates all context balances for a user pair into friendBalances table
- [x] Canonical pair ordering (`user1 < user2`) consistently applied
- [x] Proportional attribution for multi-payer scenarios

### 2. Settlement Backend (`convex/expenses.ts`)
- [x] `expenses.settleUp` — mutation: records settlement as expense with `isSettlement: true`, updates balances, logs activity

### 3. Settle Up UI (`src/pages/SettleUpPage.tsx`)
- [x] Visual payer → payee flow with avatars
- [x] Amount input pre-filled from balance (editable for partial settlements)
- [x] Group or non-group settlement support
- [x] Context info text ("records a payment that happened outside app")

### 4. Balance Display Components
- [x] `BalanceSummary.tsx` — user's net balance in a group with color coding
- [x] `GroupTabs.tsx` — Balances tab (all pairwise balances), Totals tab (group spending summary), Expenses tab (timeline by month)

### 5. Routes
- [x] Add `/settle-up` route to `App.tsx`

---

## Phase 5: Activity Feed

### 1. Activity Backend (`convex/activities.ts`)
- [x] `activities.getMyActivities` — query: aggregates activities from all groups + non-group, top 100 sorted by time, enriched with actor/group names

### 2. Activity Logging Integration
- [x] `expense_added` — logged in `addExpense` with splitSummary
- [x] `expense_deleted` — logged in `deleteExpense`
- [x] `settlement` — logged in `settleUp`
- [x] `group_created` — logged in `createGroup`
- [x] `group_updated` — logged in `updateGroup`
- [x] `member_added` — logged in `addMember`
- [x] `member_removed` — logged in `removeMember` and `leaveGroup`

### 3. Activity Page UI (`src/pages/ActivityPage.tsx`)
- [x] Full activity feed with month-year grouping
- [x] Activity type rendering: expense_added, expense_deleted, settlement, member_added, member_removed, group_created, group_updated, expense_updated
- [x] Personalized involvement text with color coding (you owe / you get back)
- [x] Relative time display (just now, Xm ago, Xh ago, Xd ago, date)
- [x] Avatar display with initials fallback
- [x] Empty state and loading skeleton
- [x] FAB to add expense

## Phase 6: Currency Support
_Coming next_
