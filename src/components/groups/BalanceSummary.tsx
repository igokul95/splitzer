import { Info } from "lucide-react";
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

export function BalanceSummary({
  myNet,
  defaultCurrency,
  balances,
}: BalanceSummaryProps) {
  if (balances.length === 0 || Math.abs(myNet) < 0.01) {
    return (
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          You are all settled up in this group
        </p>
      </div>
    );
  }

  // Find the largest balance to display as primary
  const primaryBalance = balances[0];
  const isOwed = myNet > 0;

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <p className="text-sm">
        {isOwed ? (
          <>
            {balances.length === 1 ? (
              <>
                <span className="font-medium">{primaryBalance.name}</span>
                {" owes you "}
                <span className="font-bold text-teal-600">
                  {formatCurrency(primaryBalance.amount, primaryBalance.currency)}
                </span>
              </>
            ) : (
              <>
                {"You are owed "}
                <span className="font-bold text-teal-600">
                  {formatCurrency(myNet, defaultCurrency)}
                </span>
                {" overall"}
              </>
            )}
          </>
        ) : (
          <>
            {balances.length === 1 ? (
              <>
                {"You owe "}
                <span className="font-medium">{primaryBalance.name}</span>
                {" "}
                <span className="font-bold text-orange-600">
                  {formatCurrency(primaryBalance.amount, primaryBalance.currency)}
                </span>
              </>
            ) : (
              <>
                {"You owe "}
                <span className="font-bold text-orange-600">
                  {formatCurrency(myNet, defaultCurrency)}
                </span>
                {" overall"}
              </>
            )}
          </>
        )}
      </p>
      <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
