import { formatCurrency } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowRight } from "lucide-react";

type Tab = "expenses" | "balances" | "totals";

interface GroupTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSettleUp?: () => void;
}

export function GroupTabBar({
  activeTab,
  onTabChange,
  onSettleUp,
}: GroupTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
      <button
        onClick={onSettleUp}
        className="shrink-0 rounded-full bg-teal-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700"
      >
        Settle up
      </button>
      <TabPill
        label="Expenses"
        isActive={activeTab === "expenses"}
        onClick={() => onTabChange("expenses")}
      />
      <TabPill
        label="Balances"
        isActive={activeTab === "balances"}
        onClick={() => onTabChange("balances")}
      />
      <TabPill
        label="Totals"
        isActive={activeTab === "totals"}
        onClick={() => onTabChange("totals")}
      />
    </div>
  );
}

function TabPill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
        isActive
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Tab Content Components ─────────────────────────────────────────────────

interface BalanceEntry {
  user1Id: Id<"users">;
  user1Name: string;
  user2Id: Id<"users">;
  user2Name: string;
  amount: number;
  currency: string;
}

interface BalancesTabProps {
  balances: BalanceEntry[];
  currentUserId: Id<"users">;
}

export function BalancesTab({ balances, currentUserId }: BalancesTabProps) {
  if (balances.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No balances yet. Add an expense to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {balances.map((bal, i) => {
        // amount > 0 means user2 owes user1
        const owerId = bal.amount > 0 ? bal.user2Id : bal.user1Id;
        const owerName =
          owerId === currentUserId
            ? "You"
            : bal.amount > 0
              ? bal.user2Name
              : bal.user1Name;
        const lenderId = bal.amount > 0 ? bal.user1Id : bal.user2Id;
        const lenderName =
          lenderId === currentUserId
            ? "you"
            : bal.amount > 0
              ? bal.user1Name
              : bal.user2Name;
        const absAmount = Math.abs(bal.amount);

        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
          >
            <div className="flex flex-1 items-center gap-2 text-sm">
              <span className="font-medium">{owerName}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{lenderName}</span>
            </div>
            <span
              className={`text-sm font-bold ${
                owerId === currentUserId ? "text-orange-600" : "text-teal-600"
              }`}
            >
              {formatCurrency(absAmount, bal.currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface TotalsTabProps {
  memberCount: number;
  defaultCurrency: string;
}

export function TotalsTab({ memberCount, defaultCurrency }: TotalsTabProps) {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Group spending
        </h3>
        <p className="mt-1 text-2xl font-bold">
          {formatCurrency(0, defaultCurrency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          No expenses recorded yet
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
        <p className="mt-1 text-2xl font-bold">{memberCount}</p>
      </div>
    </div>
  );
}

// ─── Expenses Tab (empty state for now) ─────────────────────────────────────

export function ExpensesTab() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No expenses yet. Tap "Add expense" to get started.
      </p>
    </div>
  );
}
