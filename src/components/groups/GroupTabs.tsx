import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { ExpenseDetailSheet } from "@/components/expenses/ExpenseDetailSheet";
import { ArrowRight, Receipt } from "lucide-react";

type Tab = "expenses" | "balances" | "totals";

interface GroupTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function GroupTabBar({ activeTab, onTabChange }: GroupTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-3 no-scrollbar">
      {(["expenses", "balances", "totals"] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all ${
            activeTab === tab
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

interface BalanceEntry {
  user1Id: Id<"users">;
  user1Name: string;
  user2Id: Id<"users">;
  user2Name: string;
  amount: number;
  currency: string;
}

export function BalancesTab({ balances, currentUserId }: { balances: BalanceEntry[]; currentUserId: Id<"users"> }) {
  if (balances.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No balances yet. Add an expense to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-4">
      {balances.map((bal, i) => {
        const owerId = bal.amount > 0 ? bal.user2Id : bal.user1Id;
        const owerName = owerId === currentUserId ? "You" : bal.amount > 0 ? bal.user2Name : bal.user1Name;
        const lenderId = bal.amount > 0 ? bal.user1Id : bal.user2Id;
        const lenderName = lenderId === currentUserId ? "you" : bal.amount > 0 ? bal.user1Name : bal.user2Name;
        const absAmount = Math.abs(bal.amount);
        const isCurrentUserOwer = owerId === currentUserId;

        return (
          <div key={i} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${isCurrentUserOwer ? "border-negative/30 bg-negative-light" : "border-positive/30 bg-positive-light"}`}>
            <div className="flex flex-1 items-center gap-2 text-sm">
              <span>{owerName}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{lenderName}</span>
            </div>
            <span className={`text-sm ${isCurrentUserOwer ? "text-negative" : "text-positive"}`}>
              {formatCurrency(absAmount, bal.currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TotalsTab({ memberCount, defaultCurrency }: { memberCount: number; defaultCurrency: string }) {
  return (
    <div className="space-y-2 px-4 py-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Group spending</p>
        <p className="mt-2 text-xl">{formatCurrency(0, defaultCurrency)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">No expenses recorded yet</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Members</p>
        <p className="mt-2 text-xl">{memberCount}</p>
      </div>
    </div>
  );
}

export function ExpensesTab({ groupId }: { groupId: Id<"groups"> }) {
  const expenses = useQuery(api.expenses.getGroupExpenses, { groupId });
  const [selectedExpenseId, setSelectedExpenseId] = useState<Id<"expenses"> | null>(null);

  if (expenses === undefined) {
    return (
      <div className="space-y-2 px-4 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-3.5">
            <div className="h-10 w-8 animate-pulse rounded bg-muted" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-36 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm">No expenses yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap "Add expense" to get started.</p>
        </div>
      </div>
    );
  }

  const grouped: Record<string, typeof expenses> = {};
  expenses.forEach((exp) => {
    const key = new Date(exp.date).toLocaleDateString("en", { month: "long", year: "numeric" });
    (grouped[key] ||= []).push(exp);
  });

  return (
    <div>
      {Object.entries(grouped).map(([monthYear, exps]) => (
        <div key={monthYear}>
          <h3 className="px-4 pb-2 pt-4 text-xs text-muted-foreground">
            {monthYear}
          </h3>
          <div className="mx-4 overflow-hidden rounded-lg border border-border bg-card">
            {exps.map((exp, idx) => (
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
      <ExpenseDetailSheet expenseId={selectedExpenseId} onClose={() => setSelectedExpenseId(null)} />
    </div>
  );
}
