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
- [x] `groups.createGroup` — mutation: creates group, adds creator as admin, invites members (ghost users if needed), logs activities
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
- [x] Create `CreateGroupPage.tsx` — form with name, type selector, currency, simplify debts toggle, add members section

### 8. Group Detail UI
- [x] Create `GroupHeader.tsx` — teal hero header with back button, settings, name, member count badge
- [x] Create `BalanceSummary.tsx` — balance bar showing who owes whom
- [x] Create `GroupTabs.tsx` — tab pills (Settle up, Expenses, Balances, Totals) with content for each
- [x] Create `GroupDetailPage.tsx` — assembles header, balance, tabs, and FAB for "Add expense"

### 9. Group Settings UI
- [x] Create `GroupSettingsPage.tsx` — edit name/type/currency/simplifyDebts, member list with add/remove, leave group, delete group (with confirmation dialogs)

### 10. Placeholder & Utility Pages
- [x] Create `FriendsPage.tsx` — placeholder with empty state
- [x] Create `ActivityPage.tsx` — placeholder with empty state
- [x] Create `AccountPage.tsx` — user profile, email, default currency, sign out button
- [x] Remove old `HomePage.tsx` (replaced by GroupsPage)

## Phase 3: Expenses & Splits
_Coming next_

## Phase 4: Balances & Settlements
_Coming next_

## Phase 5: Friends Tab & Activity Feed
_Coming next_

## Phase 6: Currency Support
_Coming next_
