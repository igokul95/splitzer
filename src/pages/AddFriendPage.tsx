import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export function AddFriendPage() {
  const navigate = useNavigate();
  const viewer = useQuery(api.users.getViewer);
  const findOrCreate = useMutation(api.users.findOrCreateByContact);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!viewer) return;

    setIsSubmitting(true);
    setError("");

    const trimmedContact = contact.trim();
    const isEmail = trimmedContact.includes("@");

    try {
      const friendId = await findOrCreate({
        name: name.trim(),
        email: isEmail ? trimmedContact : undefined,
        phone: !isEmail && trimmedContact ? trimmedContact : undefined,
        invitedBy: viewer._id,
      });
      navigate(`/friends/${friendId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add friend");
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell hideNav>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">Add friend</h1>
          <div className="w-6" />
        </header>

        <div className="flex flex-col gap-6 pt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="border-2 py-5 text-base"
            />
          </div>

          {/* Phone/Email */}
          <div className="space-y-2">
            <Label htmlFor="contact">Phone number or email address</Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="border-2 py-5 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (name.trim()) handleAdd();
                }
              }}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            They'll appear in your friends list once added. You can start
            splitting expenses with them right away.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            onClick={handleAdd}
            disabled={!name.trim() || isSubmitting}
            className="w-full rounded-full bg-muted py-3 text-sm font-medium text-muted-foreground transition-colors enabled:bg-teal-600 enabled:text-white enabled:hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Add friend"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
