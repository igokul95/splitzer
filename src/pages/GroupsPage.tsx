import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { GroupCard } from "@/components/groups/GroupCard";
import { ExpenseFab } from "@/components/expenses/ExpenseFab";
import { Link } from "react-router-dom";
import { Users, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { GroupType } from "@/lib/format";

export function GroupsPage() {
  const data = useQuery(api.groups.getMyGroups);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <h1 className="text-xl">Groups</h1>
          <Link
            to="/groups/create"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:border-brand hover:text-brand active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New group
          </Link>
        </header>

        {data === undefined ? (
          <LoadingSkeleton />
        ) : data.groups.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <OverallBalance amount={data.overallOwed} currency={data.defaultCurrency} />
            <div className="mt-3 divide-y divide-border">
              {data.groups.map((group) => (
                <GroupCard
                  key={group._id}
                  groupId={group._id}
                  name={group.name}
                  type={group.type as GroupType | undefined}
                  myNet={group.myNet}
                  defaultCurrency={group.defaultCurrency}
                  memberBalances={group.memberBalances}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {data && data.groups.length > 0 && <ExpenseFab position="tabbed" />}
    </MobileShell>
  );
}

function OverallBalance({ amount, currency }: { amount: number; currency: string }) {
  if (Math.abs(amount) < 0.01) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-card px-4 py-3">
        <div className="h-1.5 w-1.5 rounded-full bg-positive" />
        <p className="text-sm text-muted-foreground">All settled up</p>
      </div>
    );
  }
  const isOwed = amount > 0;
  return (
    <div className="mb-4 rounded-lg bg-card px-4 py-3">
      <p className="mb-0.5 text-xs text-muted-foreground">
        {isOwed ? "you're owed overall" : "you owe overall"}
      </p>
      <p className={`text-lg ${isOwed ? "text-positive" : "text-negative"}`}>
        {isOwed ? "" : "−"}{formatCurrency(Math.abs(amount), currency)}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-card">
        <Users className="h-10 w-10 text-brand" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black">No groups yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a group to start splitting expenses with friends.
        </p>
      </div>
      <Link
        to="/groups/create"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-brand hover:text-brand active:scale-95"
      >
        <Plus className="h-4 w-4" />
        Create your first group
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="py-4">
      <div className="h-20 animate-pulse rounded-lg bg-card mb-4" />
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-1 text-right">
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
