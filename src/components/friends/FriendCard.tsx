import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface GroupBreakdown {
  groupId: Id<"groups"> | undefined;
  groupName: string;
  amount: number;
  currency: string;
}

interface CurrencyBalance {
  currency: string;
  net: number;
}

interface FriendCardProps {
  friendId: Id<"users">;
  name: string;
  avatarUrl?: string;
  status?: "active" | "invited";
  netByCurrency: CurrencyBalance[];
  groupBreakdowns: GroupBreakdown[];
}


export function FriendCard({ friendId, name, avatarUrl, status, netByCurrency, groupBreakdowns }: FriendCardProps) {
  const visibleBreakdowns = groupBreakdowns.slice(0, 3);
  const hiddenCount = groupBreakdowns.length - visibleBreakdowns.length;

  return (
    <Link
      to={`/friends/${friendId}`}
      className="block py-4 transition-opacity active:opacity-60"
    >
      {/* Row 1: avatar + name + balance — all vertically centred */}
      <div className="flex items-center gap-3">
        <UserAvatar name={name} avatarUrl={avatarUrl} />
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="truncate text-[15px] text-foreground">{name}</span>
          {status === "invited" && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
              invited
            </span>
          )}
        </div>
        <MultiCurrencyBalance balances={netByCurrency} />
      </div>

      {/* Row 2: breakdown lines, indented to align with name */}
      {visibleBreakdowns.length > 0 && (
        <div className="mt-1.5 pl-[52px] space-y-1">
          {visibleBreakdowns.map((gb, i) => (
            <GroupBreakdownLine key={i} groupName={gb.groupName} amount={gb.amount} currency={gb.currency} />
          ))}
          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground/50">+{hiddenCount} more</p>
          )}
        </div>
      )}
    </Link>
  );
}

function MultiCurrencyBalance({ balances }: { balances: CurrencyBalance[] }) {
  if (balances.length === 0) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground/60">settled</span>
    );
  }

  const sorted = [...balances].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const primary = sorted[0];
  const remaining = sorted.length - 1;
  const isPositive = primary.net > 0;

  return (
    <div className="shrink-0 text-right">
      <p className="text-xs text-muted-foreground">
        {isPositive ? "owes you" : "you owe"}
      </p>
      <p className={`text-[15px] ${isPositive ? "text-positive" : "text-negative"}`}>
        {formatCurrency(Math.abs(primary.net), primary.currency)}
        {remaining > 0 && (
          <span className="text-xs font-normal text-muted-foreground"> +{remaining}</span>
        )}
      </p>
    </div>
  );
}

function GroupBreakdownLine({ groupName, amount, currency }: { groupName: string; amount: number; currency: string }) {
  return (
    <p className="truncate text-xs text-muted-foreground">
      <span className={amount > 0 ? "text-positive" : "text-negative"}>
        {formatCurrency(Math.abs(amount), currency)}
      </span>
      {" in "}{groupName}
    </p>
  );
}
