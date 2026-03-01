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
  trip: "text-orange-400",
  home: "text-brand",
  couple: "text-pink-400",
  other: "text-muted-foreground",
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
  const iconColor = TYPE_COLORS[type] || "text-muted-foreground";
  const displayBalances = memberBalances.slice(0, 2);
  const remainingCount = memberBalances.length - 2;

  return (
    <Link
      to={`/groups/${groupId}`}
      className="flex items-start gap-3 py-3.5 transition-opacity active:opacity-60"
    >
      {/* Group type icon */}
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>

      {/* Group info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] leading-tight text-foreground">{name}</span>
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
              <p className="text-xs text-muted-foreground">+{remainingCount} more</p>
            )}
          </div>
        )}
      </div>

      <BalanceLabel amount={myNet} currency={defaultCurrency} />
    </Link>
  );
}

function BalanceLabel({ amount, currency }: { amount: number; currency: string }) {
  if (Math.abs(amount) < 0.01) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground/60">settled</span>
    );
  }
  if (amount > 0) {
    return (
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">you're owed</p>
        <p className="text-[15px] text-positive">{formatCurrency(amount, currency)}</p>
      </div>
    );
  }
  return (
    <div className="shrink-0 text-right">
      <p className="text-xs text-muted-foreground">you owe</p>
      <p className="text-[15px] text-negative">{formatCurrency(Math.abs(amount), currency)}</p>
    </div>
  );
}

function MemberBalanceLine({ name, amount, currency }: { name: string; amount: number; currency: string }) {
  if (amount > 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {name} owes you{" "}
        <span className="text-positive">{formatCurrency(amount, currency)}</span>
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      You owe {name}{" "}
      <span className="text-negative">{formatCurrency(Math.abs(amount), currency)}</span>
    </p>
  );
}
