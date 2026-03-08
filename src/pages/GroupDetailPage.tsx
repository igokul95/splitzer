import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { GroupTabBar, BalancesTab, TotalsTab, ExpensesTab } from "@/components/groups/GroupTabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { UserPlus, Link as LinkIcon } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ExpenseFab } from "@/components/expenses/ExpenseFab";
import { BottomNav } from "@/components/layout/BottomNav";

type Tab = "expenses" | "balances" | "totals";

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [showSettleSheet, setShowSettleSheet] = useState(false);

  const group = useQuery(api.groups.getGroup, id ? { groupId: id as Id<"groups"> } : "skip");
  const viewer = useQuery(api.users.getViewer);

  if (!id) { navigate("/groups"); return null; }
  if (group === undefined || viewer === undefined) return <LoadingSkeleton />;
  if (group === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Group not found</p>
      </div>
    );
  }

  const settleOptions = (group.myBalances ?? []).filter((b) => Math.abs(b.amount) > 0.005);

  function handleSettleMember(bal: { userId: Id<"users">; name: string; avatarUrl?: string; amount: number; currency: string }) {
    if (!viewer) return;
    const payerId = bal.amount < 0 ? viewer._id : bal.userId;
    const payeeId = bal.amount < 0 ? bal.userId : viewer._id;
    setShowSettleSheet(false);
    navigate("/settle", {
      state: {
        payerId, payeeId,
        payerName: bal.amount < 0 ? "You" : bal.name,
        payeeName: bal.amount < 0 ? bal.name : "You",
        payerAvatarUrl: bal.amount < 0 ? viewer.avatarUrl : bal.avatarUrl,
        payeeAvatarUrl: bal.amount < 0 ? bal.avatarUrl : viewer.avatarUrl,
        amount: Math.abs(bal.amount), currency: bal.currency, groupId: id,
      },
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md pb-20">
        <GroupHeader
          groupId={group._id}
          name={group.name}
          memberCount={group.memberCount}
          type={group.type}
          myNet={group.memberCount > 1 ? group.myNet : undefined}
          defaultCurrency={group.memberCount > 1 ? group.defaultCurrency : undefined}
          balances={group.memberCount > 1 ? group.myBalances : undefined}
          onSettleUp={group.memberCount > 1 ? () => {
            if (settleOptions.length === 0) return;
            if (settleOptions.length === 1) handleSettleMember(settleOptions[0]);
            else setShowSettleSheet(true);
          } : undefined}
        />

        {group.memberCount <= 1 ? (
          <SoloMemberCard groupId={id} />
        ) : (
          <>
            <GroupTabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <div className="pb-24">
              {activeTab === "expenses" && <ExpensesTab groupId={group._id} />}
              {activeTab === "balances" && viewer && <BalancesTab balances={group.allBalances} currentUserId={viewer._id} />}
              {activeTab === "totals" && <TotalsTab memberCount={group.memberCount} defaultCurrency={group.defaultCurrency} />}
            </div>
          </>
        )}

        <ExpenseFab position="tabbed" locationState={{ groupId: id }} />

        <Sheet open={showSettleSheet} onOpenChange={setShowSettleSheet}>
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-xl bg-card border-border">
            <SheetHeader>
              <SheetTitle className="text-base">Which balance to settle?</SheetTitle>
            </SheetHeader>
            <div className="max-h-[60vh] overflow-y-auto pb-6">
              <div className="space-y-2 px-4">
                {settleOptions.map((bal) => (
                  <button
                    key={bal.userId}
                    onClick={() => handleSettleMember(bal)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted p-3.5 transition-all hover:border-brand active:scale-[0.98]"
                  >
                    <UserAvatar name={bal.name} avatarUrl={bal.avatarUrl} />
                    <div className="flex-1 text-left">
                      <p className="text-sm">{bal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {bal.amount > 0 ? `owes you ${formatCurrency(bal.amount, bal.currency)}` : `you owe ${formatCurrency(Math.abs(bal.amount), bal.currency)}`}
                      </p>
                    </div>
                    <span className={`text-sm ${bal.amount > 0 ? "text-positive" : "text-negative"}`}>
                      {formatCurrency(Math.abs(bal.amount), bal.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <BottomNav />
    </div>
  );
}

function SoloMemberCard({ groupId }: { groupId: string }) {
  return (
    <div className="px-4 py-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="mb-6 text-center text-sm font-semibold text-muted-foreground">
          You're the only one here!
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/groups/${groupId}/add-members`}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-all hover:bg-brand-hover active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Add members
          </Link>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-brand hover:text-brand">
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
      <div className="mx-auto w-full max-w-md pb-20">
        <div className="border-b border-border bg-card px-4 pb-6 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="mt-3 h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3 p-4">
          <div className="h-14 animate-pulse rounded-lg bg-card" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-muted" />)}
          </div>
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-card" />)}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
