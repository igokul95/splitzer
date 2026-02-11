import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface FriendHeaderProps {
  friendId: string;
  name: string;
  shortName: string;
  avatarUrl?: string;
  balances: Array<{ source: "group" | "nonGroup"; net: number; currency: string }>;
}

// Stable avatar colors derived from name
const AVATAR_COLORS_HEX = [
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#6366f1", // indigo-500
  "#06b6d4", // cyan-500
];

function getAvatarColorHex(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS_HEX[Math.abs(hash) % AVATAR_COLORS_HEX.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function FriendHeader({
  friendId,
  name,
  shortName,
  avatarUrl,
  balances,
}: FriendHeaderProps) {
  const navigate = useNavigate();

  // Build balance lines — one line per (source, direction), multi-currency joined with " + "
  const lineMap = new Map<string, { amounts: string[]; direction: "owed" | "owe"; source: "group" | "nonGroup" }>();
  for (const b of balances) {
    const direction = b.net > 0 ? "owed" : "owe";
    const key = `${b.source}:${direction}`;
    let entry = lineMap.get(key);
    if (!entry) {
      entry = { amounts: [], direction, source: b.source };
      lineMap.set(key, entry);
    }
    entry.amounts.push(formatCurrency(Math.abs(b.net), b.currency));
  }

  const balanceLines: string[] = [];
  for (const { amounts, direction, source } of lineMap.values()) {
    const amountStr = amounts.join(" + ");
    const suffix = source === "group" ? " in groups" : " individually";
    if (direction === "owed") {
      balanceLines.push(`${shortName} owes you ${amountStr}${suffix}`);
    } else {
      balanceLines.push(`You owe ${shortName} ${amountStr}${suffix}`);
    }
  }

  return (
    <div className="relative bg-gradient-to-br from-teal-700 to-teal-600 px-4 pb-6 pt-[env(safe-area-inset-top)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => navigate("/friends")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          onClick={() => navigate(`/friends/${friendId}/settings`)}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Avatar */}
      <div className="mt-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-16 w-16 rounded-full border-2 border-white/30 object-cover"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 text-xl font-bold text-white"
            style={{ backgroundColor: getAvatarColorHex(name) }}
          >
            {getInitials(name)}
          </div>
        )}
      </div>

      {/* Friend name */}
      <h1 className="mt-3 text-2xl font-bold text-white">{name}</h1>

      {/* Balance summary */}
      {balanceLines.length === 0 ? (
        <p className="mt-1 text-sm text-white/80">All settled up</p>
      ) : (
        <div className="mt-1 space-y-0.5">
          {balanceLines.map((line, i) => (
            <p key={i} className="text-sm text-white/80">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
