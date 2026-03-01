import { formatCurrency } from "@/lib/format";
import { HandCoins, Receipt, ShoppingCart, Utensils, Car, Home, Zap, Film } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Zap,
  entertainment: Film,
  shopping: ShoppingCart,
  general: Receipt,
};

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  food: { bg: "bg-orange-900/30", icon: "text-orange-400" },
  transport: { bg: "bg-sky-900/30", icon: "text-sky-400" },
  housing: { bg: "bg-green-900/30", icon: "text-green-400" },
  utilities: { bg: "bg-yellow-900/30", icon: "text-yellow-400" },
  entertainment: { bg: "bg-purple-900/30", icon: "text-purple-400" },
  shopping: { bg: "bg-pink-900/30", icon: "text-pink-400" },
  general: { bg: "bg-muted", icon: "text-muted-foreground" },
};

function getCategoryIcon(category?: string): React.ElementType {
  if (!category) return Receipt;
  return CATEGORY_ICONS[category.toLowerCase()] ?? Receipt;
}

function getCategoryColor(category?: string, isSettlement = false) {
  if (isSettlement) return { bg: "bg-brand-light", icon: "text-brand" };
  if (!category) return CATEGORY_COLORS.general;
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.general;
}

interface ExpenseRowProps {
  description: string;
  date: number;
  category?: string;
  paidByName: string;
  paidByAmount: number;
  currency: string;
  isSettlement: boolean;
  myInvolvement: { type: "borrowed" | "lent" | "settled_up" | "not_involved"; amount: number };
  onClick?: () => void;
}

export function ExpenseRow({ description, date, category, paidByName, paidByAmount, currency, isSettlement, myInvolvement, onClick }: ExpenseRowProps) {
  const dateObj = new Date(date);
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString("en", { month: "short" });
  const CategoryIcon = isSettlement ? HandCoins : getCategoryIcon(category);
  const colors = getCategoryColor(category, isSettlement);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5${onClick ? " cursor-pointer transition-colors hover:bg-muted/40 active:bg-muted" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Date column */}
      <div className="w-8 shrink-0 text-center">
        <p className="text-[10px] text-muted-foreground">{monthShort}</p>
        <p className="text-base leading-tight text-foreground">{dayNum}</p>
      </div>

      {/* Category icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
        <CategoryIcon className={`h-5 w-5 ${colors.icon}`} />
      </div>

      {/* Description + payer */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          {paidByName} paid {formatCurrency(paidByAmount, currency)}
        </p>
      </div>

      <InvolvementLabel type={myInvolvement.type} amount={myInvolvement.amount} currency={currency} />
    </div>
  );
}

export function InvolvementLabel({ type, amount, currency }: { type: "borrowed" | "lent" | "settled_up" | "not_involved"; amount: number; currency: string }) {
  if (type === "settled_up" || type === "not_involved") {
    return (
      <span className="shrink-0 text-xs text-muted-foreground/60">settled</span>
    );
  }
  if (type === "lent") {
    return (
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">lent</p>
        <p className="text-xs text-positive">{formatCurrency(amount, currency)}</p>
      </div>
    );
  }
  return (
    <div className="shrink-0 text-right">
      <p className="text-xs text-muted-foreground">owe</p>
      <p className="text-xs text-negative">{formatCurrency(amount, currency)}</p>
    </div>
  );
}
