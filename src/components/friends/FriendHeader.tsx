import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, CheckCircle2, HandCoins } from "lucide-react";


function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface FriendHeaderProps {
  friendId: string;
  name: string;
  avatarUrl?: string;
  totalLines: { amount: string; direction: "owed" | "owe" }[];
  balanceLines: { prefix: string; amount: string; suffix: string; direction: "owed" | "owe" }[];
  settled: boolean;
  onSettleUp?: () => void;
}

export function FriendHeader({ friendId, name, avatarUrl, totalLines, balanceLines, settled, onSettleUp }: FriendHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b border-border bg-card px-4 pb-5 pt-[env(safe-area-inset-top)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => navigate("/friends")}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:border-brand hover:text-brand"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:border-brand hover:text-brand"
          onClick={() => navigate(`/friends/${friendId}/settings`)}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 pt-1">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base bg-muted text-muted-foreground">
            {getInitials(name)}
          </div>
        )}
        <div>
          <h1 className="text-xl text-foreground">{name}</h1>
        </div>
      </div>

      {/* Balance summary */}
      <div className="mt-4">
        {settled ? (
          <div className="flex items-center gap-2 py-1">
            <CheckCircle2 className="h-4 w-4 text-positive" />
            <span className="text-xs text-muted-foreground">All settled up</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Balance</span>
              <div className="flex items-center gap-2">
                {totalLines.map((t, i) => (
                  <span key={i} className={`text-base ${t.direction === "owed" ? "text-positive" : "text-negative"}`}>
                    {t.direction === "owe" ? "-" : "+"}{t.amount}
                  </span>
                ))}
              </div>
            </div>
            {balanceLines.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {balanceLines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{line.suffix.trim()}</span>
                    <span className={`text-xs ${line.direction === "owed" ? "text-positive" : "text-negative"}`}>
                      {line.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

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
