import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { GroupCard } from "@/components/groups/GroupCard";
import { Link } from "react-router-dom";
import { Search, Users, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { GroupType } from "@/lib/format";

export function GroupsPage() {
  const data = useQuery(api.groups.getMyGroups);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <button className="p-1 text-foreground">
            <Search className="h-5 w-5" />
          </button>
          <Link
            to="/groups/create"
            className="text-sm font-medium text-teal-600"
          >
            Create group
          </Link>
        </header>

        {/* Content */}
        {data === undefined ? (
          <LoadingSkeleton />
        ) : data.groups.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Overall balance banner */}
            <OverallBalance
              amount={data.overallOwed}
              currency={data.defaultCurrency}
            />

            {/* Group list */}
            <div className="divide-y divide-border">
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
    </MobileShell>
  );
}

function OverallBalance({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  if (Math.abs(amount) < 0.01) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">
          You are all settled up!
        </p>
      </div>
    );
  }

  const isOwed = amount > 0;

  return (
    <div className="py-4">
      <p className="text-sm">
        Overall,{" "}
        <span className={isOwed ? "text-teal-600" : "text-orange-600"}>
          {isOwed ? "you are owed " : "you owe "}
          <span className="font-bold">
            {formatCurrency(amount, currency)}
          </span>
        </span>
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
        <Users className="h-10 w-10 text-teal-600" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">No groups yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a group to start splitting expenses with friends.
        </p>
      </div>
      <Link
        to="/groups/create"
        className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        <Plus className="h-4 w-4" />
        Create your first group
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="h-11 w-11 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
