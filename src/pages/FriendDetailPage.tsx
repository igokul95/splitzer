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
  HandCoins,
  Receipt,
  Users,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
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

  // Group non-group expenses by month-year
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

  // Compute per-currency net totals across all sources (group + nonGroup)
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
    navigate("/settle", {
      state: {
        payerId,
        payeeId,
        payerName,
        payeeName,
        amount: Math.abs(net),
        currency,
      },
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md pb-16">
        {/* Hero header with balance summary */}
        <FriendHeader
          friendId={id}
          name={data.friend.name}
          avatarUrl={data.friend.avatarUrl}
          {...buildBalanceLines(data.balancesByCurrency, data.friend.shortName)}
        />

        {/* Action buttons */}
        <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
          <ActionButton
            label="Settle up"
            icon={HandCoins}
            variant="primary"
            onClick={() => {
              if (!viewer || !data || currencyTotals.length === 0) return;
              if (currencyTotals.length === 1) {
                navigateToSettle(currencyTotals[0].currency, currencyTotals[0].net);
              } else {
                setShowCurrencyPicker(true);
              }
            }}
          />
        </div>

        <div className="pb-24">
          {isEmpty ? (
            <ExpenseEmptyState friendName={data.friend.name} />
          ) : (
            <>
              {/* Shared Groups */}
              {hasGroups && (
                <div>
                  <h3 className="px-4 py-3 text-sm font-semibold text-foreground">
                    Groups
                  </h3>
                  <div className="divide-y divide-border">
                    {data.sharedGroups.map((group) => {
                      const isSettled = Math.abs(group.amount) < 0.005;
                      return (
                        <button
                          key={group.groupId}
                          onClick={() => navigate(`/groups/${group.groupId}`)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
                            <Users className="h-5 w-5 text-brand-dark" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
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
                                you owe {formatCurrency(group.amount, group.currency)}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Non-group Expenses */}
              {hasNonGroupExpenses && (
                <div>
                  <h3 className="px-4 py-3 text-sm font-semibold text-foreground">
                    Non-group expenses
                  </h3>
                  {Object.entries(grouped).map(([monthYear, expenses]) => (
                    <div key={monthYear}>
                      <p className="px-4 py-2 text-xs text-muted-foreground">
                        {monthYear}
                      </p>
                      <div className="divide-y divide-border">
                        {expenses.map((exp) => (
                          <ExpenseRow
                            key={exp._id}
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
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Which balance do you want to settle?</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pb-4 pt-2">
            {currencyTotals.map((ct) => (
              <button
                key={ct.currency}
                className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted active:bg-muted"
                onClick={() => {
                  setShowCurrencyPicker(false);
                  navigateToSettle(ct.currency, ct.net);
                }}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{ct.currency}</p>
                  <p className="text-xs text-muted-foreground">
                    {ct.net > 0
                      ? `${data?.friend.shortName} owes you`
                      : `You owe ${data?.friend.shortName}`}
                  </p>
                </div>
                <span className={`text-sm font-bold ${ct.net > 0 ? "text-positive" : "text-negative"}`}>
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

function ActionButton({
  label,
  icon: Icon,
  variant,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  variant: "primary" | "outline";
  onClick: () => void;
}) {
  if (variant === "primary") {
    return (
      <button
        onClick={onClick}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:scale-[0.98]"
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ExpenseEmptyState({ friendName }: { friendName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Receipt className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">No shared expenses yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add an expense to start tracking what you and {friendName} owe each
          other.
        </p>
      </div>
    </div>
  );
}

function buildBalanceLines(
  balances: Array<{ source: "group" | "nonGroup"; net: number; currency: string }>,
  shortName: string,
) {
  // Total net per currency across all sources
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

  // Per-source breakdown
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
    const suffix = source === "group" ? " in groups" : " individually";
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
      <div className="mx-auto w-full max-w-md pb-16">
        <div className="bg-brand-dark px-4 pb-6 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
          </div>
          <div className="mt-2 h-7 w-40 animate-pulse rounded bg-white/20" />
          <div className="mt-2 h-4 w-52 animate-pulse rounded bg-white/20" />
        </div>
        <div className="flex gap-2 px-4 py-4">
          {[1].map((i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        <div className="space-y-4 px-4">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-1 text-right">
                <div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
