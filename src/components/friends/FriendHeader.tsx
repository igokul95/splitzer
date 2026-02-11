import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, CheckCircle2 } from "lucide-react";

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

interface BalanceLine {
  prefix: string;
  amount: string;
  suffix: string;
  direction: "owed" | "owe";
}

interface TotalLine {
  amount: string;
  direction: "owed" | "owe";
}

interface FriendHeaderProps {
  friendId: string;
  name: string;
  avatarUrl?: string;
  totalLines: TotalLine[];
  balanceLines: BalanceLine[];
  settled: boolean;
}

export function FriendHeader({
  friendId,
  name,
  avatarUrl,
  totalLines,
  balanceLines,
  settled,
}: FriendHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="relative bg-gradient-to-br from-brand-dark via-brand to-blue-400 px-4 pb-5 pt-[env(safe-area-inset-top)]">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={() => navigate("/friends")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15"
            onClick={() => navigate(`/friends/${friendId}/settings`)}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 pt-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/30"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white"
            >
              {getInitials(name)}
            </div>
          )}
          <h1 className="text-xl font-bold text-white">{name}</h1>
        </div>
      </div>

      {/* Balance summary */}
      <div className="mx-4 mt-3 rounded-xl border border-border p-3">
        {settled ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <CheckCircle2 className="h-4 w-4 text-positive" />
            <span className="text-sm text-muted-foreground">All settled up</span>
          </div>
        ) : (
          <>
            {/* Total row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance</span>
              <div className="flex items-center gap-2">
                {totalLines.map((t, i) => (
                  <span key={i} className={`text-base font-bold ${t.direction === "owed" ? "text-positive" : "text-negative"}`}>
                    {t.direction === "owe" ? "-" : "+"}{t.amount}
                  </span>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            {balanceLines.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                {balanceLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">{line.suffix.trim()}</span>
                    <span className={`text-xs font-semibold ${line.direction === "owed" ? "text-positive" : "text-negative"}`}>
                      {line.direction === "owe" ? "-" : "+"}{line.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
