import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MobileShell } from "@/components/layout/MobileShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export function AddContactPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = id as Id<"groups">;
  const addMember = useMutation(api.groups.addMember);

  // Preserve returnTo so the add-members page knows where to go after
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!id) {
    navigate("/groups");
    return null;
  }

  const handleNext = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // Determine if the contact field is an email or phone
    const trimmedContact = contact.trim();
    const isEmail = trimmedContact.includes("@");

    try {
      await addMember({
        groupId,
        name: name.trim(),
        email: isEmail ? trimmedContact : undefined,
        phone: !isEmail && trimmedContact ? trimmedContact : undefined,
      });
      // Go back to add-members page (preserving returnTo state)
      navigate(`/groups/${id}/add-members`, { state: { returnTo } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell hideNav>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <button
            onClick={() =>
              navigate(`/groups/${id}/add-members`, { state: { returnTo } })
            }
            className="p-1"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">Add friend</h1>
          <div className="w-6" /> {/* Spacer for centering */}
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
                  if (name.trim()) handleNext();
                }
              }}
            />
          </div>

          {/* Reassurance text */}
          <p className="text-center text-xs text-muted-foreground">
            Don't worry, nothing sends just yet. You will have another chance to
            review before sending.
          </p>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={!name.trim() || isSubmitting}
            className="w-full rounded-full bg-muted py-3 text-sm font-medium text-muted-foreground transition-colors enabled:bg-teal-600 enabled:text-white enabled:hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Next"}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
