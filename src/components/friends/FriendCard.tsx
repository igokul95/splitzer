import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { Id } from "../../../convex/_generated/dataModel";

interface GroupBreakdown {
  groupId: Id<"groups"> | undefined;
  groupName: string;
  amount: number;
  currency: string;
}

interface FriendCardProps {
  friendId: Id<"users">;
  name: string;
  avatarUrl?: string;
  net: number;
  currency: string;
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
  net,
  currency,
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
          <BalanceLabel amount={net} currency={currency} />
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
        <p className="text-xs font-medium text-positive">owes you</p>
        <p className="text-sm font-bold text-positive">
          {formatCurrency(amount, currency)}
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 text-right">
      <p className="text-xs font-medium text-negative">you owe</p>
      <p className="text-sm font-bold text-negative">
        {formatCurrency(amount, currency)}
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
