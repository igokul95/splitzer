import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FriendHeader } from "@/components/friends/FriendHeader";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpenseDetailSheet } from "@/components/expenses/ExpenseDetailSheet";
import { formatCurrency } from "@/lib/format";
import {
  Receipt,
  ChevronRight,
  CheckCircle2,
  Plane,
  Home,
  Heart,
  LayoutGrid,
} from "lucide-react";

const GROUP_TYPE_ICONS: Record<string, React.ElementType> = {
  trip: Plane,
  home: Home,
  couple: Heart,
  other: LayoutGrid,
};

const GROUP_TYPE_COLORS: Record<string, string> = {
  trip: "text-orange-400",
  home: "text-brand",
  couple: "text-pink-400",
  other: "text-muted-foreground",
};
import { ExpenseFab } from "@/components/expenses/ExpenseFab";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function FriendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const viewer = useQuery(api.users.getViewer);
  const data = useQuery(
    api.friends.getFriendDetail,
    id ? { friendId: id as Id<"users"> } : "skip"
  );

  const [selectedExpenseId, setSelectedExpenseId] = useState<Id<"expenses"> | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  if (!id) {
    navigate("/friends");
    return null;
  }

  if (data === undefined) {
    return <LoadingSkeleton />;
  }

  const grouped: Record<string, typeof data.nonGroupExpenses> = {};
  data.nonGroupExpenses.forEach((exp) => {
    const key = new Date(exp.date).toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
    (grouped[key] ||= []).push(exp);
  });

  const hasGroups = data.sharedGroups.length > 0;
  const hasNonGroupExpenses = data.nonGroupExpenses.length > 0;
  const isEmpty = !hasGroups && !hasNonGroupExpenses;

  const currencyTotals: Array<{ currency: string; net: number }> = [];
  {
    const map = new Map<string, number>();
    for (const b of data.balancesByCurrency) {
      map.set(b.currency, (map.get(b.currency) ?? 0) + b.net);
    }
    for (const [currency, net] of map) {
      if (Math.abs(net) >= 0.005) {
        currencyTotals.push({ currency, net });
      }
    }
  }

  function navigateToSettle(currency: string, net: number) {
    if (!viewer || !data) return;
    const payerId = net < 0 ? viewer._id : data.friend._id;
    const payeeId = net < 0 ? data.friend._id : viewer._id;
    const payerName = net < 0 ? "You" : data.friend.name;
    const payeeName = net < 0 ? data.friend.name : "You";
    const payerAvatarUrl = net < 0 ? viewer.avatarUrl : data.friend.avatarUrl;
    const payeeAvatarUrl = net < 0 ? data.friend.avatarUrl : viewer.avatarUrl;
    navigate("/settle", {
      state: {
        payerId,
        payeeId,
        payerName,
        payeeName,
        payerAvatarUrl,
        payeeAvatarUrl,
        amount: Math.abs(net),
        currency,
      },
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md pb-20">
        <FriendHeader
          friendId={id}
          name={data.friend.name}
          avatarUrl={data.friend.avatarUrl}
          {...buildBalanceLines(data.balancesByCurrency, data.friend.shortName)}
          onSettleUp={currencyTotals.length > 0 ? () => {
            if (!viewer || !data) return;
            if (currencyTotals.length === 1) {
              navigateToSettle(currencyTotals[0].currency, currencyTotals[0].net);
            } else {
              setShowCurrencyPicker(true);
            }
          } : undefined}
        />

        <div className="pb-24">
          {isEmpty ? (
            <ExpenseEmptyState friendName={data.friend.name} />
          ) : (
            <>
              {/* Shared Groups */}
              {hasGroups && (
                <div className="mb-4">
                  <h3 className="px-4 pb-2 pt-3 text-xs text-muted-foreground">
                    Shared groups
                  </h3>
                  <div className="mx-4 overflow-hidden rounded-lg border border-border bg-card">
                    {data.sharedGroups.map((group, idx) => {
                      const isSettled = Math.abs(group.amount) < 0.005;
                      return (
                        <button
                          key={group.groupId}
                          onClick={() => navigate(`/groups/${group.groupId}`)}
                          className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted active:bg-muted ${idx > 0 ? "border-t border-border" : ""}`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                            {(() => {
                              const Icon = GROUP_TYPE_ICONS[group.groupType ?? "other"] ?? LayoutGrid;
                              const color = GROUP_TYPE_COLORS[group.groupType ?? "other"] ?? "text-muted-foreground";
                              return <Icon className={`h-5 w-5 ${color}`} />;
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">
                              {group.groupName}
                            </p>
                            {isSettled ? (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3" />
                                settled up
                              </p>
                            ) : group.amount > 0 ? (
                              <p className="text-xs text-positive">
                                owes you {formatCurrency(group.amount, group.currency)}
                              </p>
                            ) : (
                              <p className="text-xs text-negative">
                                you owe {formatCurrency(Math.abs(group.amount), group.currency)}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Non-group Expenses */}
              {hasNonGroupExpenses && (
                <div>
                  <h3 className="px-4 pb-2 pt-3 text-xs text-muted-foreground">
                    Non-group expenses
                  </h3>
                  {Object.entries(grouped).map(([monthYear, expenses]) => (
                    <div key={monthYear} className="mb-3">
                      <p className="px-4 pb-1 text-xs text-muted-foreground">
                        {monthYear}
                      </p>
                      <div className="mx-4 overflow-hidden rounded-2xl bg-card shadow-sm">
                        {expenses.map((exp, idx) => (
                          <div key={exp._id} className={idx > 0 ? "border-t border-border" : ""}>
                            <ExpenseRow
                              description={exp.description}
                              date={exp.date}
                              category={exp.category}
                              paidByName={exp.paidByName}
                              paidByAmount={exp.paidByAmount}
                              currency={exp.currency}
                              isSettlement={exp.isSettlement}
                              myInvolvement={exp.myInvolvement}
                              onClick={() => setSelectedExpenseId(exp._id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* FAB */}
        <ExpenseFab position="tabbed" locationState={{ friendId: id! }} />
      </div>

      <BottomNav />

      <ExpenseDetailSheet
        expenseId={selectedExpenseId}
        onClose={() => setSelectedExpenseId(null)}
      />

      {/* Currency picker for multi-currency settle up */}
      <Sheet open={showCurrencyPicker} onOpenChange={setShowCurrencyPicker}>
        <SheetContent side="bottom" className="rounded-t-xl bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Which balance to settle?</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pb-6 px-4 pt-1">
            {currencyTotals.map((ct) => (
              <button
                key={ct.currency}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-3.5 transition-all hover:border-brand active:scale-[0.98]"
                onClick={() => {
                  setShowCurrencyPicker(false);
                  navigateToSettle(ct.currency, ct.net);
                }}
              >
                <div className="text-left">
                  <p className="text-sm text-foreground">{ct.currency}</p>
                  <p className="text-xs text-muted-foreground">
                    {ct.net > 0
                      ? `${data?.friend.shortName} owes you`
                      : `You owe ${data?.friend.shortName}`}
                  </p>
                </div>
                <span className={`text-sm ${ct.net > 0 ? "text-positive" : "text-negative"}`}>
                  {formatCurrency(Math.abs(ct.net), ct.currency)}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ExpenseEmptyState({ friendName }: { friendName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Receipt className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">No shared expenses yet</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Add an expense to start tracking what you and {friendName} owe each other.
        </p>
      </div>
    </div>
  );
}

function buildBalanceLines(
  balances: Array<{ source: "group" | "nonGroup"; net: number; currency: string }>,
  shortName: string,
) {
  const totalMap = new Map<string, number>();
  for (const b of balances) {
    totalMap.set(b.currency, (totalMap.get(b.currency) ?? 0) + b.net);
  }

  const totalLines: Array<{ amount: string; direction: "owed" | "owe" }> = [];
  for (const [currency, net] of totalMap) {
    if (Math.abs(net) < 0.005) continue;
    totalLines.push({
      amount: formatCurrency(Math.abs(net), currency),
      direction: net > 0 ? "owed" : "owe",
    });
  }

  const lineMap = new Map<string, { amounts: string[]; direction: "owed" | "owe"; source: "group" | "nonGroup" }>();
  for (const b of balances) {
    const direction = b.net > 0 ? "owed" : "owe";
    const key = `${b.source}:${direction}`;
    let entry = lineMap.get(key);
    if (!entry) {
      entry = { amounts: [], direction, source: b.source };
      lineMap.set(key, entry);
    }
    entry.amounts.push(formatCurrency(Math.abs(b.net), b.currency));
  }

  const balanceLines: Array<{ prefix: string; amount: string; suffix: string; direction: "owed" | "owe" }> = [];
  for (const { amounts, direction, source } of lineMap.values()) {
    const amountStr = amounts.join(" + ");
    const suffix = source === "group" ? "Groups" : "Non-group";
    if (direction === "owed") {
      balanceLines.push({ prefix: `${shortName} owes you `, amount: amountStr, suffix, direction });
    } else {
      balanceLines.push({ prefix: `You owe ${shortName} `, amount: amountStr, suffix, direction });
    }
  }

  return { balanceLines, totalLines, settled: totalLines.length === 0 };
}

function LoadingSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md pb-20">
        <div className="border-b border-border bg-card px-4 pb-5 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
