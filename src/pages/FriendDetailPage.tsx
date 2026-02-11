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

export function FriendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const viewer = useQuery(api.users.getViewer);
  const data = useQuery(
    api.friends.getFriendDetail,
    id ? { friendId: id as Id<"users"> } : "skip"
  );

  const [selectedExpenseId, setSelectedExpenseId] = useState<Id<"expenses"> | null>(null);

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

  console.log("non group expenses", data.nonGroupExpenses);
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Hero header */}
        <FriendHeader
          friendId={id}
          name={data.friend.name}
          shortName={data.friend.shortName}
          avatarUrl={data.friend.avatarUrl}
          balances={data.balancesByCurrency}
        />

        {/* Action buttons */}
        <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
          <ActionButton
            label="Settle up"
            icon={HandCoins}
            variant="primary"
            onClick={() => {
              if (!viewer || !data || Math.abs(data.overallNet) < 0.005) return;
              const payerId = data.overallNet < 0 ? viewer._id : data.friend._id;
              const payeeId = data.overallNet < 0 ? data.friend._id : viewer._id;
              const payerName = data.overallNet < 0 ? "You" : data.friend.name;
              const payeeName = data.overallNet < 0 ? data.friend.name : "You";
              navigate("/settle", {
                state: {
                  payerId,
                  payeeId,
                  payerName,
                  payeeName,
                  amount: Math.abs(data.overallNet),
                  currency: data.currency,
                },
              });
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
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100">
                            <Users className="h-5 w-5 text-teal-700" />
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
                              <p className="text-xs text-teal-600">
                                owes you {formatCurrency(group.amount, group.currency)}
                              </p>
                            ) : (
                              <p className="text-xs text-orange-600">
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
        <ExpenseFab position="detail" locationState={{ friendId: id! }} />
      </div>

      <ExpenseDetailSheet
        expenseId={selectedExpenseId}
        onClose={() => setSelectedExpenseId(null)}
      />
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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 active:scale-[0.98]"
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

function LoadingSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        <div className="bg-teal-700 px-4 pb-6 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
          </div>
          <div className="mt-2 h-16 w-16 animate-pulse rounded-full bg-white/20" />
          <div className="mt-3 h-7 w-40 animate-pulse rounded bg-white/20" />
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
    </div>
  );
}
