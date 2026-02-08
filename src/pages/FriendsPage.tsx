import { useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { FriendCard } from "@/components/friends/FriendCard";
import { Search, Users, ChevronDown, ChevronUp, UserPlus, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";

export function FriendsPage() {
  const data = useQuery(api.friends.getMyFriends);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="p-1 text-foreground"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link to="/friends/add" className="text-sm font-medium text-teal-600">
            Add friends
          </Link>
        </header>

        {/* Search bar (toggleable) */}
        {showSearch && (
          <div className="pb-3">
            <input
              autoFocus
              type="text"
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {/* Content */}
        {data === undefined ? (
          <LoadingSkeleton />
        ) : data.visible.length === 0 && data.hidden.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Overall balance banner */}
            <OverallBalance
              youOwe={data.youOwe}
              youAreOwed={data.youAreOwed}
            />

            {/* Visible friends list */}
            <div className="divide-y divide-border">
              {data.visible
                .filter((f) =>
                  f.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((friend) => (
                  <FriendCard
                    key={friend.friendId}
                    friendId={friend.friendId}
                    name={friend.name}
                    avatarUrl={friend.avatarUrl}
                    net={friend.net}
                    currency={friend.currency}
                    groupBreakdowns={friend.groupBreakdowns}
                  />
                ))}
            </div>

            {/* Hidden friends toggle */}
            {data.hidden.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowHidden((v) => !v)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  {showHidden ? (
                    <>
                      Hide {data.hidden.length} settled friend
                      {data.hidden.length > 1 ? "s" : ""}
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show {data.hidden.length} hidden friend
                      {data.hidden.length > 1 ? "s" : ""}
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>

                {showHidden && (
                  <div className="mt-2 divide-y divide-border">
                    {data.hidden
                      .filter((f) =>
                        f.name.toLowerCase().includes(search.toLowerCase())
                      )
                      .map((friend) => (
                        <FriendCard
                          key={friend.friendId}
                          friendId={friend.friendId}
                          name={friend.name}
                          avatarUrl={friend.avatarUrl}
                          net={friend.net}
                          currency={friend.currency}
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

      {/* FAB — Add expense */}
      {data && (data.visible.length > 0 || data.hidden.length > 0) && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            className="flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95"
            onClick={() => navigate("/expenses/add")}
          >
            <Receipt className="h-4 w-4" />
            Add expense
          </button>
        </div>
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
      <div className="py-4">
        <p className="text-sm text-muted-foreground">
          You are all settled up!
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {youOwe.length > 0 && (
        <p className="text-sm">
          Overall, you owe{" "}
          {youOwe.map((entry, i) => (
            <span key={entry.currency}>
              {i > 0 && " + "}
              <span className="font-bold text-orange-600">
                {formatCurrency(entry.amount, entry.currency)}
              </span>
            </span>
          ))}
        </p>
      )}
      {youAreOwed.length > 0 && (
        <p className="text-sm">
          {youOwe.length > 0 ? "and you are owed " : "Overall, you are owed "}
          {youAreOwed.map((entry, i) => (
            <span key={entry.currency}>
              {i > 0 && " + "}
              <span className="font-bold text-teal-600">
                {formatCurrency(entry.amount, entry.currency)}
              </span>
            </span>
          ))}
        </p>
      )}
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
        <h2 className="text-lg font-semibold">No friends yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your friends and balances will appear here once you start splitting
          expenses.
        </p>
      </div>
      <Link
        to="/groups/create"
        className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        <UserPlus className="h-4 w-4" />
        Create a group
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {/* Balance banner skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-52 animate-pulse rounded bg-muted" />
        <div className="h-4 w-44 animate-pulse rounded bg-muted" />
      </div>
      {/* Friend list skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-1 text-right">
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
