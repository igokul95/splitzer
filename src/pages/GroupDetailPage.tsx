import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { BalanceSummary } from "@/components/groups/BalanceSummary";
import {
  GroupTabBar,
  BalancesTab,
  TotalsTab,
  ExpensesTab,
} from "@/components/groups/GroupTabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { UserPlus, Link as LinkIcon } from "lucide-react";
import { ExpenseFab } from "@/components/expenses/ExpenseFab";

type Tab = "expenses" | "balances" | "totals";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [showSettleSheet, setShowSettleSheet] = useState(false);

  const group = useQuery(
    api.groups.getGroup,
    id ? { groupId: id as Id<"groups"> } : "skip"
  );
  const viewer = useQuery(api.users.getViewer);

  if (!id) {
    navigate("/groups");
    return null;
  }

  if (group === undefined || viewer === undefined) {
    return <LoadingSkeleton />;
  }

  if (group === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Group not found</p>
      </div>
    );
  }

  // Settle-up: find members with non-zero balances relative to the current user
  const settleOptions = (group.myBalances ?? []).filter(
    (b) => Math.abs(b.amount) > 0.005
  );

  function handleSettleMember(bal: {
    userId: Id<"users">;
    name: string;
    amount: number;
    currency: string;
  }) {
    if (!viewer) return;
    // amount > 0 means they owe me (I'm the payee, they're the payer)
    // amount < 0 means I owe them (I'm the payer, they're the payee)
    const payerId = bal.amount < 0 ? viewer._id : bal.userId;
    const payeeId = bal.amount < 0 ? bal.userId : viewer._id;
    const payerName = bal.amount < 0 ? "You" : bal.name;
    const payeeName = bal.amount < 0 ? bal.name : "You";

    setShowSettleSheet(false);
    navigate("/settle", {
      state: {
        payerId,
        payeeId,
        payerName,
        payeeName,
        amount: Math.abs(bal.amount),
        currency: bal.currency,
        groupId: id,
      },
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Hero header */}
        <GroupHeader
          groupId={group._id}
          name={group.name}
          memberCount={group.memberCount}
          type={group.type}
        />

        {group.memberCount <= 1 ? (
          /* Solo member empty state */
          <SoloMemberCard groupId={id} />
        ) : (
          <>
            {/* Balance summary bar */}
            <BalanceSummary
              myNet={group.myNet}
              defaultCurrency={group.defaultCurrency}
              balances={group.myBalances}
            />

            {/* Tab bar */}
            <GroupTabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSettleUp={() => {
                if (settleOptions.length === 0) return;
                if (settleOptions.length === 1) {
                  handleSettleMember(settleOptions[0]);
                } else {
                  setShowSettleSheet(true);
                }
              }}
            />

            {/* Tab content */}
            <div className="pb-24">
              {activeTab === "expenses" && (
                <ExpensesTab groupId={group._id} />
              )}
              {activeTab === "balances" && viewer && (
                <BalancesTab
                  balances={group.allBalances}
                  currentUserId={viewer._id}
                />
              )}
              {activeTab === "totals" && (
                <TotalsTab
                  memberCount={group.memberCount}
                  defaultCurrency={group.defaultCurrency}
                />
              )}
            </div>
          </>
        )}

        {/* FAB */}
        <ExpenseFab position="detail" locationState={{ groupId: id }} />

        {/* Settle-up sheet */}
        <Sheet open={showSettleSheet} onOpenChange={setShowSettleSheet}>
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Settle up</SheetTitle>
            </SheetHeader>
            <div className="max-h-[60vh] overflow-y-auto pb-4">
              <p className="px-4 pb-3 text-sm text-muted-foreground">
                Choose a balance to settle:
              </p>
              {settleOptions.map((bal) => (
                <button
                  key={bal.userId}
                  onClick={() => handleSettleMember(bal)}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {bal.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{bal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bal.amount > 0
                        ? `owes you ${formatCurrency(bal.amount, bal.currency)}`
                        : `you owe ${formatCurrency(Math.abs(bal.amount), bal.currency)}`}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      bal.amount > 0 ? "text-teal-600" : "text-orange-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(bal.amount), bal.currency)}
                  </span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function SoloMemberCard({ groupId }: { groupId: string }) {
  return (
    <div className="px-4 py-8">
      <div className="rounded-2xl bg-muted/40 px-6 py-8">
        <p className="mb-6 text-center text-sm text-muted-foreground">
          You're the only one here!
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/groups/${groupId}/add-members`}
            className="flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Add members
          </Link>
          <button className="flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            <LinkIcon className="h-4 w-4" />
            Share a link
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Hero skeleton */}
        <div className="bg-teal-700 px-4 pb-6 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
          </div>
          <div className="mt-2 h-7 w-48 animate-pulse rounded bg-white/20" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-white/20" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-white/20" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="space-y-4 p-4">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 w-20 animate-pulse rounded-full bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
