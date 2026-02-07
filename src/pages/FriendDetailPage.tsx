import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FriendHeader } from "@/components/friends/FriendHeader";
import { formatCurrency } from "@/lib/format";
import {
  HandCoins,
  Bell,
  PieChart,
  ArrowRightLeft,
  Receipt,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  MoreHorizontal,
} from "lucide-react";

// Category icon mapping
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

export function FriendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const data = useQuery(
    api.friends.getFriendDetail,
    id ? { friendId: id as Id<"users"> } : "skip"
  );

  if (!id) {
    navigate("/friends");
    return null;
  }

  if (data === undefined) {
    return <LoadingSkeleton />;
  }

  // Group expenses by month-year
  const grouped: Record<string, typeof data.sharedExpenses> = {};
  data.sharedExpenses.forEach((exp) => {
    const key = new Date(exp.date).toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
    (grouped[key] ||= []).push(exp);
  });

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md">
        {/* Hero header */}
        <FriendHeader
          name={data.friend.name}
          shortName={data.friend.shortName}
          avatarUrl={data.friend.avatarUrl}
          net={data.overallNet}
          currency={data.currency}
        />

        {/* Action buttons */}
        <div className="flex gap-2 overflow-x-auto px-4 py-4 scrollbar-hide">
          <ActionButton
            label="Settle up"
            icon={HandCoins}
            variant="primary"
            onClick={() => {
              // TODO: Phase 4 — settle up
            }}
          />
          <ActionButton
            label="Remind..."
            icon={Bell}
            variant="outline"
            onClick={() => {
              // TODO: Remind
            }}
          />
          <ActionButton
            label="Charts"
            icon={PieChart}
            variant="outline"
            onClick={() => {
              // TODO: Charts
            }}
          />
          <ActionButton
            label="Convert to..."
            icon={ArrowRightLeft}
            variant="outline"
            onClick={() => {
              // TODO: Convert currency
            }}
          />
        </div>

        {/* Expense timeline */}
        <div className="pb-24">
          {data.sharedExpenses.length === 0 ? (
            <ExpenseEmptyState friendName={data.friend.name} />
          ) : (
            Object.entries(grouped).map(([monthYear, expenses]) => (
              <div key={monthYear}>
                {/* Month header */}
                <h3 className="px-4 py-3 text-sm font-semibold text-foreground">
                  {monthYear}
                </h3>

                {/* Expense rows */}
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
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FAB — Add expense */}
        <div className="fixed bottom-6 right-4 z-50 flex max-w-md flex-col items-end gap-2">
          <button
            className="flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95"
            onClick={() => {
              // TODO: Phase 3 — add expense with this friend
            }}
          >
            <Receipt className="h-4 w-4" />
            Add expense
          </button>
        </div>
      </div>
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

function ExpenseRow({
  description,
  date,
  category,
  paidByName,
  paidByAmount,
  currency,
  isSettlement,
  myInvolvement,
}: {
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
}) {
  const dateObj = new Date(date);
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString("en", { month: "short" });

  const CategoryIcon = isSettlement
    ? HandCoins
    : getCategoryIcon(category);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
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

function InvolvementLabel({
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
        {/* Hero skeleton */}
        <div className="bg-teal-700 px-4 pb-6 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between py-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/20" />
          </div>
          <div className="mt-2 h-16 w-16 animate-pulse rounded-full bg-white/20" />
          <div className="mt-3 h-7 w-40 animate-pulse rounded bg-white/20" />
          <div className="mt-2 h-4 w-52 animate-pulse rounded bg-white/20" />
        </div>
        {/* Action buttons skeleton */}
        <div className="flex gap-2 px-4 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        {/* Expense list skeleton */}
        <div className="space-y-4 px-4">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-8 animate-pulse rounded bg-muted" />
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
