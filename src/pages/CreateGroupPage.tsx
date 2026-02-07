import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Plane,
  Home,
  Heart,
  LayoutGrid,
  UserPlus,
  X,
} from "lucide-react";
import type { GroupType } from "@/lib/format";
import type { PendingMember } from "./CreateAddMembersPage";

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

export function CreateGroupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createGroupWithMembers = useMutation(api.groups.createGroupWithMembers);
  const viewer = useQuery(api.users.getViewer);

  // Restore form state from navigation (when returning from add-members / add-contact)
  const restored = location.state?.formState;

  const [name, setName] = useState<string>(restored?.name ?? "");
  const [type, setType] = useState<GroupType>(restored?.type ?? "trip");
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>(
    restored?.pendingMembers ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleRemoveMember = (index: number) => {
    setPendingMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMembers = () => {
    navigate("/groups/create/add-members", {
      state: {
        formState: { name, type, pendingMembers },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const groupId = await createGroupWithMembers({
        name: name.trim(),
        type,
        members: pendingMembers.map((m) => ({
          name: m.name,
          email: m.email || undefined,
          phone: m.phone || undefined,
        })),
      });

      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell hideNav>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center gap-3 py-4">
          <button onClick={() => navigate("/groups")} className="p-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Create group</h1>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-8">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group name</Label>
            <Input
              id="name"
              placeholder="e.g. Goa Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!restored}
            />
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {GROUP_TYPES.map((gt) => {
                const Icon = gt.icon;
                const isSelected = type === gt.value;
                return (
                  <button
                    key={gt.value}
                    type="button"
                    onClick={() => setType(gt.value)}
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

          <Separator />

          {/* Members */}
          <div className="space-y-3">
            <Label>
              Members{" "}
              <span className="text-muted-foreground">
                ({pendingMembers.length + 1})
              </span>
            </Label>

            {/* Member list */}
            <div className="space-y-2">
              {/* Creator (You) */}
              <div className="flex items-center rounded-lg bg-muted/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {viewer?.avatarUrl ? (
                    <img
                      src={viewer.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      {(viewer?.name ?? "Y").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="text-sm font-medium">
                    {viewer?.name ?? "You"}
                  </p>
                </div>
              </div>

              {/* Pending members */}
              {pendingMembers.map((m, idx) => (
                <div
                  key={idx}
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
                      <p className="text-sm font-medium">{m.name}</p>
                      {(m.email || m.phone) && (
                        <p className="text-xs text-muted-foreground">
                          {m.email || m.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add members button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddMembers}
              className="w-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add members
            </Button>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}
