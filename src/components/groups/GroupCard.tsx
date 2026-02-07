import { Link } from "react-router-dom";
import { Plane, Home, Heart, LayoutGrid } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { GroupType } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";

interface MemberBalance {
  userId: Id<"users">;
  name: string;
  amount: number;
  currency: string;
}

interface GroupCardProps {
  groupId: Id<"groups">;
  name: string;
  type?: GroupType;
  myNet: number;
  defaultCurrency: string;
  memberBalances: MemberBalance[];
}

const TYPE_ICONS = {
  trip: Plane,
  home: Home,
  couple: Heart,
  other: LayoutGrid,
};

const TYPE_COLORS = {
  trip: "bg-orange-500",
  home: "bg-teal-600",
  couple: "bg-pink-500",
  other: "bg-gray-500",
};

export function GroupCard({
  groupId,
  name,
  type = "other",
  myNet,
  defaultCurrency,
  memberBalances,
}: GroupCardProps) {
  const Icon = TYPE_ICONS[type] || LayoutGrid;
  const bgColor = TYPE_COLORS[type] || "bg-gray-500";

  const displayBalances = memberBalances.slice(0, 2);
  const remainingCount = memberBalances.length - 2;

  return (
    <Link
      to={`/groups/${groupId}`}
      className="flex items-start gap-3 py-4 transition-colors active:bg-muted/50"
    >
      {/* Group type icon */}
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${bgColor}`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>

      {/* Group info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate font-semibold leading-tight">{name}</span>
          <BalanceLabel amount={myNet} currency={defaultCurrency} />
        </div>

        {/* Member balance summaries */}
        {displayBalances.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            {displayBalances.map((mb) => (
              <MemberBalanceLine
                key={mb.userId}
                name={mb.name}
                amount={mb.amount}
                currency={mb.currency}
              />
            ))}
            {remainingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Plus {remainingCount} more balance
                {remainingCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function BalanceLabel({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  if (Math.abs(amount) < 0.01) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground">
        settled up
      </span>
    );
  }

  if (amount > 0) {
    return (
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-teal-600">you are owed</p>
        <p className="text-sm font-bold text-teal-600">
          {formatCurrency(amount, currency)}
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 text-right">
      <p className="text-xs font-medium text-orange-600">you owe</p>
      <p className="text-sm font-bold text-orange-600">
        {formatCurrency(amount, currency)}
      </p>
    </div>
  );
}

function MemberBalanceLine({
  name,
  amount,
  currency,
}: {
  name: string;
  amount: number;
  currency: string;
}) {
  if (amount > 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {name} owes you{" "}
        <span className="text-teal-600">{formatCurrency(amount, currency)}</span>
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      You owe {name}{" "}
      <span className="text-orange-600">
        {formatCurrency(amount, currency)}
      </span>
    </p>
  );
}
