import { formatCurrency } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";

interface BalanceDetail {
  userId: Id<"users">;
  name: string;
  amount: number;
  currency: string;
}

interface BalanceSummaryProps {
  myNet: number;
  defaultCurrency: string;
  balances: BalanceDetail[];
}

export function BalanceSummary({ myNet, balances }: BalanceSummaryProps) {
  if (balances.length === 0 || Math.abs(myNet) < 0.01) {
    return (
      <div className="mx-4 my-3 flex items-center gap-2 rounded-lg border border-positive/30 bg-positive-light px-4 py-3">
        <span className="text-xs text-positive">✓ All settled up</span>
      </div>
    );
  }

  const primaryBalance = balances[0];
  const isOwed = myNet > 0;

  return (
    <div className={`mx-4 my-3 rounded-lg border px-4 py-3 ${isOwed ? "border-positive/30 bg-positive-light" : "border-negative/30 bg-negative-light"}`}>
      <p className="text-xs text-muted-foreground">Your balance</p>
      <p className={`mt-1 text-lg ${isOwed ? "text-positive" : "text-negative"}`}>
        {isOwed ? "+" : "-"}{formatCurrency(Math.abs(primaryBalance.amount), primaryBalance.currency)}
      </p>
      <p className={`text-xs ${isOwed ? "text-positive" : "text-negative"}`}>
        {isOwed
          ? balances.length === 1 ? `${primaryBalance.name} owes you` : "you are owed overall"
          : balances.length === 1 ? `you owe ${primaryBalance.name}` : "you owe overall"
        }
      </p>
    </div>
  );
}
