import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Users, Plane, Home, Heart, LayoutGrid, CheckCircle2, HandCoins } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency } from "@/lib/format";

const TYPE_ICONS: Record<string, React.ElementType> = {
  trip: Plane,
  home: Home,
  couple: Heart,
  other: LayoutGrid,
};

const TYPE_COLORS: Record<string, string> = {
  trip: "text-orange-400",
  home: "text-brand",
  couple: "text-pink-400",
  other: "text-muted-foreground",
};

interface BalanceDetail {
  userId: Id<"users">;
  name: string;
  amount: number;
  currency: string;
}

interface GroupHeaderProps {
  groupId: Id<"groups">;
  name: string;
  memberCount: number;
  type?: string;
  myNet?: number;
  defaultCurrency?: string;
  balances?: BalanceDetail[];
  onSettleUp?: () => void;
}

export function GroupHeader({ groupId, name, memberCount, type = "other", myNet, defaultCurrency, balances, onSettleUp }: GroupHeaderProps) {
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[type] ?? LayoutGrid;
  const iconColor = TYPE_COLORS[type] ?? "text-muted-foreground";

  const showBalance = balances !== undefined && defaultCurrency !== undefined && myNet !== undefined;
  const isSettled = showBalance && (balances.length === 0 || Math.abs(myNet) < 0.01);

  return (
    <div className="bg-card border-b border-border px-4 pb-5 pt-[env(safe-area-inset-top)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:border-brand hover:text-brand"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate(`/groups/${groupId}/settings`)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:border-brand hover:text-brand"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <h1 className="text-xl text-foreground">{name}</h1>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {memberCount} {memberCount === 1 ? "person" : "people"}
          </span>
        </div>
      </div>

      {/* Balance summary */}
      {showBalance && (
        <div className="mt-4">
          {isSettled ? (
            <div className="flex items-center gap-2 py-1">
              <CheckCircle2 className="h-4 w-4 text-positive" />
              <span className="text-xs text-muted-foreground">All settled up</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Balance</span>
                <span className={`text-base ${myNet > 0 ? "text-positive" : "text-negative"}`}>
                  {myNet > 0 ? "+" : "-"}{formatCurrency(Math.abs(myNet), defaultCurrency)}
                </span>
              </div>
              {balances.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {balances.map((b) => (
                    <div key={b.userId} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{b.name}</span>
                      <span className={`text-xs ${b.amount > 0 ? "text-positive" : "text-negative"}`}>
                        {b.amount > 0 ? "+" : "-"}{formatCurrency(Math.abs(b.amount), b.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Settle up button */}
      {onSettleUp && (
        <div className="mt-4">
          <button
            onClick={onSettleUp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-lg transition-all hover:border-brand hover:text-brand active:scale-95"
          >
            <HandCoins className="h-3.5 w-3.5" />
            Settle up
          </button>
        </div>
      )}
    </div>
  );
}
