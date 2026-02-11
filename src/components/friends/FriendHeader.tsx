import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";

const AVATAR_COLORS = [
  "bg-teal-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

function getAvatarColor(name: string): string {
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

interface FriendHeaderProps {
  friendId: string;
  name: string;
  avatarUrl?: string;
}

export function FriendHeader({
  friendId,
  name,
  avatarUrl,
}: FriendHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-brand-dark to-brand px-4 pb-6 pt-[env(safe-area-inset-top)]">
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

      {/* Friend name + avatar */}
      <div className="mt-2 flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
          />
        ) : (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-white/30 ${getAvatarColor(name)}`}
          >
            {getInitials(name)}
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">{name}</h1>
      </div>
    </div>
  );
}
