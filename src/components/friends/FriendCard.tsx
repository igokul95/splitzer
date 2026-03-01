import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";

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
  netByCurrency: CurrencyBalance[];
  groupBreakdowns: GroupBreakdown[];
}

// Brand-harmonious pastel avatars — all within the blue family of #2979FF
const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-50", text: "text-blue-600" },
  { bg: "bg-sky-50", text: "text-sky-600" },
  { bg: "bg-indigo-50", text: "text-indigo-600" },
  { bg: "bg-cyan-50", text: "text-cyan-600" },
  { bg: "bg-violet-50", text: "text-violet-600" },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Abbreviate name for breakdown labels: "Anandu vijayakumar" -> "Anandu v." */
function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }
  return name;
}

export function FriendCard({
  friendId,
  name,
  avatarUrl,
  netByCurrency,
  groupBreakdowns,
}: FriendCardProps) {
  const hasGroupBreakdowns = groupBreakdowns.length > 0;

  return (
    <Link
      to={`/friends/${friendId}`}
      className="flex items-start gap-3 py-4 transition-colors active:bg-muted/50"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(name).bg} ${getAvatarColor(name).text}`}
          >
            {getInitials(name)}
          </div>
        )}
      </div>

      {/* Name + balance */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate font-medium leading-tight">{name}</span>
          <MultiCurrencyBalance balances={netByCurrency} />
        </div>

        {/* Per-group breakdowns (shown when multiple groups have balances) */}
        {hasGroupBreakdowns && (
          <div className="mt-1 space-y-0.5">
            {groupBreakdowns.map((gb, i) => (
              <GroupBreakdownLine
                key={i}
                friendName={abbreviateName(name)}
                groupName={gb.groupName}
                amount={gb.amount}
                currency={gb.currency}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function MultiCurrencyBalance({
  balances,
}: {
  balances: CurrencyBalance[];
}) {
  if (balances.length === 0) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground">
        settled up
      </span>
    );
  }

  // Show the largest absolute balance as primary
  const sorted = [...balances].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const primary = sorted[0];
  const remaining = sorted.length - 1;

  const isPositive = primary.net > 0;
  const colorClass = isPositive ? "text-positive" : "text-negative";
  const label = isPositive ? "owes you" : "you owe";

  return (
    <div className="shrink-0 text-right">
      <p className={`text-xs font-medium ${colorClass}`}>{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>
        {formatCurrency(primary.net, primary.currency)}
        {remaining > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {" "}+ {remaining} more
          </span>
        )}
      </p>
    </div>
  );
}

function GroupBreakdownLine({
  friendName,
  groupName,
  amount,
  currency,
}: {
  friendName: string;
  groupName: string;
  amount: number;
  currency: string;
}) {
  if (amount > 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {friendName} owes you{" "}
        <span className="font-medium text-positive">
          {formatCurrency(amount, currency)}
        </span>
        {" in \u201C"}
        {groupName}
        {"\u201D"}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      You owe {friendName}{" "}
      <span className="font-medium text-negative">
        {formatCurrency(amount, currency)}
      </span>
      {" in \u201C"}
      {groupName}
      {"\u201D"}
    </p>
  );
}
