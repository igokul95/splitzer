import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { FriendCard } from "@/components/friends/FriendCard";
import { ExpenseFab } from "@/components/expenses/ExpenseFab";
import { Search, Users, ChevronDown, ChevronUp, UserPlus, X, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";

export function FriendsPage() {
  const data = useQuery(api.friends.getMyFriends);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <h1 className="text-xl">Friends</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <Link
              to="/friends/add"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:border-brand hover:text-brand active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add friend
            </Link>
          </div>
        </header>

        {/* Search bar */}
        {showSearch && (
          <div className="pb-3">
            <input
              autoFocus
              type="text"
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
            />
          </div>
        )}

        {data === undefined ? (
          <LoadingSkeleton />
        ) : data.visible.length === 0 && data.hidden.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <OverallBalance youOwe={data.youOwe} youAreOwed={data.youAreOwed} />

            <div className="divide-y divide-border">
              {data.visible
                .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
                .map((friend) => (
                  <FriendCard
                    key={friend.friendId}
                    friendId={friend.friendId}
                    name={friend.name}
                    avatarUrl={friend.avatarUrl}
                    status={friend.status}
                    netByCurrency={friend.netByCurrency}
                    groupBreakdowns={friend.groupBreakdowns}
                  />
                ))}
            </div>

            {data.hidden.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowHidden((v) => !v)}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
                >
                  {showHidden ? (
                    <><span>Hide settled friends</span><ChevronUp className="h-3.5 w-3.5" /></>
                  ) : (
                    <><span>{data.hidden.length} settled friend{data.hidden.length > 1 ? "s" : ""}</span><ChevronDown className="h-3.5 w-3.5" /></>
                  )}
                </button>

                {showHidden && (
                  <div className="mt-1 divide-y divide-border">
                    {data.hidden
                      .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
                      .map((friend) => (
                        <FriendCard
                          key={friend.friendId}
                          friendId={friend.friendId}
                          name={friend.name}
                          avatarUrl={friend.avatarUrl}
                          status={friend.status}
                          netByCurrency={friend.netByCurrency}
                          groupBreakdowns={friend.groupBreakdowns}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {data && (data.visible.length > 0 || data.hidden.length > 0) && (
        <ExpenseFab position="tabbed" />
      )}
    </MobileShell>
  );
}

function OverallBalance({
  youOwe,
  youAreOwed,
}: {
  youOwe: { currency: string; amount: number }[];
  youAreOwed: { currency: string; amount: number }[];
}) {
  if (youOwe.length === 0 && youAreOwed.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-card px-4 py-3">
        <div className="h-1.5 w-1.5 rounded-full bg-positive" />
        <p className="text-sm text-muted-foreground">All settled up</p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex rounded-lg bg-card px-4 py-3">
      {youOwe.length > 0 && (
        <div className="flex-1">
          <p className="mb-0.5 text-xs text-muted-foreground">you owe</p>
          {youOwe.map((entry) => (
            <p key={entry.currency} className="text-[15px] leading-tight text-negative">
              {formatCurrency(entry.amount, entry.currency)}
            </p>
          ))}
        </div>
      )}
      {youAreOwed.length > 0 && (
        <div className="flex-1 text-right">
          <p className="mb-0.5 text-xs text-muted-foreground">you're owed</p>
          {youAreOwed.map((entry) => (
            <p key={entry.currency} className="text-[15px] leading-tight text-positive">
              {formatCurrency(entry.amount, entry.currency)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-md border border-border bg-card">
        <Users className="h-10 w-10 text-brand" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black">No friends yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your friends and balances will appear here once you start splitting.
        </p>
      </div>
      <Link
        to="/groups/create"
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-brand hover:text-brand active:scale-95"
      >
        <UserPlus className="h-4 w-4" />
        Create a group
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="py-2">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 h-20 animate-pulse rounded-md bg-card" />
        <div className="flex-1 h-20 animate-pulse rounded-md bg-card" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-1 text-right">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
