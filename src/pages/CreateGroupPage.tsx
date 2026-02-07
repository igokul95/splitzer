import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Plane,
  Home,
  Heart,
  LayoutGrid,
  X,
  UserPlus,
} from "lucide-react";
import { SUPPORTED_CURRENCIES } from "@/lib/format";
import type { GroupType } from "@/lib/format";

interface PendingMember {
  id: string;
  name: string;
  email: string;
}

const GROUP_TYPES: { value: GroupType; label: string; icon: React.ElementType }[] = [
  { value: "trip", label: "Trip", icon: Plane },
  { value: "home", label: "Home", icon: Home },
  { value: "couple", label: "Couple", icon: Heart },
  { value: "other", label: "Other", icon: LayoutGrid },
];

export function CreateGroupPage() {
  const navigate = useNavigate();
  const createGroup = useMutation(api.groups.createGroup);

  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("trip");
  const [currency, setCurrency] = useState("INR");
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addMember = () => {
    if (!memberName.trim()) return;
    setMembers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: memberName.trim(),
        email: memberEmail.trim(),
      },
    ]);
    setMemberName("");
    setMemberEmail("");
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
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
      const groupId = await createGroup({
        name: name.trim(),
        type,
        defaultCurrency: currency,
        simplifyDebts,
        members: members.map((m) => ({
          name: m.name,
          email: m.email || undefined,
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
          <button onClick={() => navigate(-1)} className="p-1">
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
              autoFocus
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

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Default currency</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
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
              <Label htmlFor="simplify">Simplify debts</Label>
              <p className="text-xs text-muted-foreground">
                Minimize the number of payments between members
              </p>
            </div>
            <Switch
              id="simplify"
              checked={simplifyDebts}
              onCheckedChange={setSimplifyDebts}
            />
          </div>

          <Separator />

          {/* Members Section */}
          <div className="space-y-3">
            <Label>Members</Label>

            {/* Added members */}
            {members.length > 0 && (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      {m.email && (
                        <p className="text-xs text-muted-foreground">
                          {m.email}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add member form */}
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <Input
                placeholder="Name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (memberName.trim()) addMember();
                  }
                }}
              />
              <Input
                placeholder="Email (optional)"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (memberName.trim()) addMember();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                disabled={!memberName.trim()}
                className="w-full gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add member
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
