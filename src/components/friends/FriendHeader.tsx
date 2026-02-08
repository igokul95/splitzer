import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface FriendHeaderProps {
  friendId: string;
  name: string;
  shortName: string;
  avatarUrl?: string;
  net: number;
  currency: string;
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
  net,
  currency,
}: FriendHeaderProps) {
  const navigate = useNavigate();

  // Balance summary text
  let balanceText = "";
  if (Math.abs(net) < 0.01) {
    balanceText = "All settled up";
  } else if (net > 0) {
    balanceText = `${shortName} owes you ${formatCurrency(net, currency)}`;
  } else {
    balanceText = `You owe ${shortName} ${formatCurrency(net, currency)}`;
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
      <p className="mt-1 text-sm text-white/80">{balanceText}</p>
    </div>
  );
}
