import { formatCurrency } from "@/lib/format";
import {
  HandCoins,
  Receipt,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Zap,
  entertainment: Film,
  shopping: ShoppingCart,
  general: Receipt,
};

function getCategoryIcon(category?: string): React.ElementType {
  if (!category) return Receipt;
  return CATEGORY_ICONS[category.toLowerCase()] ?? Receipt;
}

interface ExpenseRowProps {
  description: string;
  date: number;
  category?: string;
  paidByName: string;
  paidByAmount: number;
  currency: string;
  isSettlement: boolean;
  myInvolvement: {
    type: "borrowed" | "lent" | "settled_up" | "not_involved";
    amount: number;
  };
  onClick?: () => void;
}

export function ExpenseRow({
  description,
  date,
  category,
  paidByName,
  paidByAmount,
  currency,
  isSettlement,
  myInvolvement,
  onClick,
}: ExpenseRowProps) {
  const dateObj = new Date(date);
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString("en", { month: "short" });

  const CategoryIcon = isSettlement ? HandCoins : getCategoryIcon(category);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3${onClick ? " cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Date column */}
      <div className="w-8 shrink-0 text-center">
        <p className="text-xs text-muted-foreground">{monthShort}</p>
        <p className="text-lg font-semibold leading-tight">{dayNum}</p>
      </div>

      {/* Category icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <CategoryIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Description + payer */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{description}</p>
        <p className="text-xs text-muted-foreground">
          {paidByName} paid {formatCurrency(paidByAmount, currency)}
        </p>
      </div>

      {/* My involvement */}
      <InvolvementLabel
        type={myInvolvement.type}
        amount={myInvolvement.amount}
        currency={currency}
      />
    </div>
  );
}

export function InvolvementLabel({
  type,
  amount,
  currency,
}: {
  type: "borrowed" | "lent" | "settled_up" | "not_involved";
  amount: number;
  currency: string;
}) {
  if (type === "settled_up" || type === "not_involved") {
    return (
      <span className="shrink-0 text-xs text-muted-foreground">
        settled up
      </span>
    );
  }

  if (type === "lent") {
    return (
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-teal-600">you lent</p>
        <p className="text-sm font-bold text-teal-600">
          {formatCurrency(amount, currency)}
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 text-right">
      <p className="text-xs font-medium text-orange-600">you borrowed</p>
      <p className="text-sm font-bold text-orange-600">
        {formatCurrency(amount, currency)}
      </p>
    </div>
  );
}
