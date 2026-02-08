import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings, Calendar, Users } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface GroupHeaderProps {
  groupId: Id<"groups">;
  name: string;
  memberCount: number;
  type?: string;
}

export function GroupHeader({
  groupId,
  name,
  memberCount,
}: GroupHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-teal-700 to-teal-600 px-4 pb-6 pt-[env(safe-area-inset-top)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate(`/groups/${groupId}/settings`)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Group name */}
      <h1 className="mt-2 text-2xl font-bold text-white">{name}</h1>

      {/* Badges */}
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
          <Calendar className="h-3 w-3" />
          Group
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
          <Users className="h-3 w-3" />
          {memberCount} {memberCount === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
}
