import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MobileShell } from "@/components/layout/MobileShell";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Mail, Users } from "lucide-react";

export function FriendSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const data = useQuery(
    api.friends.getFriendDetail,
    id ? { friendId: id as Id<"users"> } : "skip"
  );

  if (!id) {
    navigate("/friends");
    return null;
  }

  if (data === undefined) {
    return (
      <MobileShell hideNav>
        <div className="flex min-h-[80dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell hideNav>
      <div className="flex flex-col px-4 pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center gap-3 py-4">
          <button onClick={() => navigate(`/friends/${id}`)} className="p-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{data.friend.name}</h1>
        </header>

        <div className="flex flex-col gap-6 pb-8">
          {/* Email */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {data.friend.email || "No email available"}
              </span>
            </div>
          </div>

          <Separator />

          {/* Shared Groups */}
          <div className="space-y-3">
            <Label>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shared groups ({data.sharedGroups.length})
              </span>
            </Label>

            {data.sharedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shared groups with {data.friend.name}
              </p>
            ) : (
              <div className="space-y-2">
                {data.sharedGroups.map((group) => (
                  <button
                    key={group.groupId}
                    onClick={() => navigate(`/groups/${group.groupId}`)}
                    className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-medium">
                      {group.groupName}
                    </span>
                    <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
