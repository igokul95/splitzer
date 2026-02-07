import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileShell } from "@/components/layout/MobileShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { CreateGroupFormState, PendingMember } from "./CreateAddMembersPage";

export function CreateAddContactPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const formState: CreateGroupFormState = location.state?.formState ?? {
    name: "",
    type: "trip",
    pendingMembers: [],
  };

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const trimmedContact = contact.trim();
    const isEmail = trimmedContact.includes("@");

    const newMember: PendingMember = {
      name: name.trim(),
      email: isEmail ? trimmedContact : undefined,
      phone: !isEmail && trimmedContact ? trimmedContact : undefined,
    };

    // Navigate back to create page with the new contact added
    navigate("/groups/create", {
      state: {
        formState: {
          ...formState,
          pendingMembers: [...formState.pendingMembers, newMember],
        },
      },
    });
  };

  const handleCancel = () => {
    navigate("/groups/create/add-members", { state: { formState } });
  };

  return (
    <MobileShell hideNav>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <button onClick={handleCancel} className="p-1">
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
            disabled={!name.trim()}
            className="w-full rounded-full bg-muted py-3 text-sm font-medium text-muted-foreground transition-colors enabled:bg-teal-600 enabled:text-white enabled:hover:bg-teal-700 disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
