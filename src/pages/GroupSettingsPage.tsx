import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Plane,
  Home,
  Heart,
  LayoutGrid,
  UserPlus,
  X,
  LogOut,
  Trash2,
  Crown,
} from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/format";
import type { GroupType } from "@/lib/format";

const GROUP_TYPES: {
  value: GroupType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "trip", label: "Trip", icon: Plane },
  { value: "home", label: "Home", icon: Home },
  { value: "couple", label: "Couple", icon: Heart },
  { value: "other", label: "Other", icon: LayoutGrid },
];

export function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const groupId = id as Id<"groups">;

  const group = useQuery(api.groups.getGroup, id ? { groupId } : "skip");
  const members = useQuery(
    api.groups.getGroupMembers,
    id ? { groupId } : "skip"
  );

  const updateGroup = useMutation(api.groups.updateGroup);
  const removeMember = useMutation(api.groups.removeMember);
  const leaveGroup = useMutation(api.groups.leaveGroup);
  const deleteGroup = useMutation(api.groups.deleteGroup);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Dialogs
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!id) {
    navigate("/groups");
    return null;
  }

  if (group === undefined || members === undefined) {
    return (
      <MobileShell hideNav>
        <div className="flex min-h-[80dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      </MobileShell>
    );
  }

  if (group === null) {
    return (
      <MobileShell hideNav>
        <div className="flex min-h-[80dvh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Group not found</p>
        </div>
      </MobileShell>
    );
  }

  const activeMembers = members.filter((m) => m.status !== "left");
  const isAdmin = group.myRole === "admin";

  const handleSave = async (updates: {
    name?: string;
    type?: GroupType;
    defaultCurrency?: string;
    simplifyDebts?: boolean;
  }) => {
    setIsSaving(true);
    setError("");
    try {
      await updateGroup({ groupId, ...updates });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
    setIsSaving(false);
  };

  const handleRemoveMember = async (userId: Id<"users">) => {
    setError("");
    try {
      await removeMember({ groupId, userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleLeave = async () => {
    setError("");
    try {
      await leaveGroup({ groupId });
      navigate("/groups");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to leave group"
      );
      setShowLeaveDialog(false);
    }
  };

  const handleDelete = async () => {
    setError("");
    try {
      await deleteGroup({ groupId });
      navigate("/groups");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete group"
      );
      setShowDeleteDialog(false);
    }
  };

  return (
    <MobileShell hideNav>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center gap-3 py-4">
          <button onClick={() => navigate(`/groups/${id}`)} className="p-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Group settings</h1>
        </header>

        <div className="flex flex-col gap-6 pb-8">
          {/* Group Name */}
          <EditableField
            label="Group name"
            value={group.name}
            onSave={(value) => handleSave({ name: value })}
            isSaving={isSaving}
          />

          {/* Group Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {GROUP_TYPES.map((gt) => {
                const Icon = gt.icon;
                const isSelected = group.type === gt.value;
                return (
                  <button
                    key={gt.value}
                    type="button"
                    onClick={() => handleSave({ type: gt.value })}
                    disabled={isSaving}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {gt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Default currency</Label>
            <select
              id="currency"
              value={group.defaultCurrency}
              onChange={(e) =>
                handleSave({ defaultCurrency: e.target.value })
              }
              disabled={isSaving}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Simplify Debts */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Simplify debts</Label>
              <p className="text-xs text-muted-foreground">
                Minimize the number of payments between members
              </p>
            </div>
            <Switch
              checked={group.simplifyDebts}
              onCheckedChange={(checked) =>
                handleSave({ simplifyDebts: checked })
              }
              disabled={isSaving}
            />
          </div>

          <Separator />

          {/* Members */}
          <div className="space-y-3">
            <Label>Members ({activeMembers.length})</Label>

            {/* Member list */}
            <div className="space-y-2">
              {activeMembers.map((m) => (
                <div
                  key={m._id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{m.name}</p>
                        {m.role === "admin" && (
                          <Crown className="h-3 w-3 text-amber-500" />
                        )}
                        {m.userStatus === "invited" && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            invited
                          </span>
                        )}
                      </div>
                      {m.email && (
                        <p className="text-xs text-muted-foreground">
                          {m.email}
                        </p>
                      )}
                    </div>
                  </div>
                  {isAdmin && m.role !== "admin" && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add members button */}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(`/groups/${id}/add-members`, {
                  state: { returnTo: `/groups/${id}/settings` },
                })
              }
              className="w-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add members
            </Button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Separator />

          {/* Danger zone */}
          <div className="space-y-3">
            <Label className="text-destructive">Danger zone</Label>

            {/* Leave Group */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Leave group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leave group?</DialogTitle>
                  <DialogDescription>
                    You can only leave if your net balance in this group is zero.
                    You can rejoin later if invited.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowLeaveDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleLeave}>
                    Leave
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Group (admin only) */}
            {isAdmin && (
              <Dialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete group?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. All group data will be
                      permanently deleted. This is only possible when all
                      balances are settled.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

// ─── Inline editable field ──────────────────────────────────────────────────

function EditableField({
  label,
  value,
  onSave,
  isSaving,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    if (draft.trim() && draft !== value) {
      onSave(draft.trim());
    }
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <button
          onClick={() => {
            setDraft(value);
            setIsEditing(true);
          }}
          className="w-full rounded-md border border-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
        >
          {value}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsEditing(false);
        }}
        autoFocus
        disabled={isSaving}
      />
    </div>
  );
}
