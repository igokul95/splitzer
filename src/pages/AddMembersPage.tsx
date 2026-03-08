import { useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { MobileShell } from "@/components/layout/MobileShell";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Check } from "lucide-react";

export interface PendingMember {
  name: string;
  email?: string;
  phone?: string;
  _id?: string;
  avatarUrl?: string | null;
}

export interface CreateGroupFormState {
  name: string;
  type: string;
  pendingMembers: PendingMember[];
}

export function AddMembersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Create-group flow: no groupId in URL, formState passed via location.state
  const isCreateFlow = !id;
  const formState: CreateGroupFormState = location.state?.formState ?? {
    name: "",
    type: "trip",
    pendingMembers: [],
  };
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const groupId = id as Id<"groups"> | undefined;
  const addMember = useMutation(api.groups.addMember);

  const contacts = useQuery(
    api.groups.getKnownContacts,
    groupId ? { groupId } : {}
  );

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // In create flow, exclude already-pending members
  const pendingIds = new Set(
    formState.pendingMembers.filter((m) => m._id).map((m) => m._id!)
  );
  const availableContacts = (contacts ?? []).filter(
    (c) => c && (!isCreateFlow || !pendingIds.has(c._id))
  );
  const filteredContacts = availableContacts.filter(
    (c) => c && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCancel = () => {
    if (isCreateFlow) navigate("/groups/create", { state: { formState } });
    else navigate(returnTo || `/groups/${id}`);
  };

  const handleDone = async () => {
    if (selected.size === 0) {
      handleCancel();
      return;
    }

    if (isCreateFlow) {
      const newMembers: PendingMember[] = availableContacts
        .filter((c) => c && selected.has(c._id))
        .map((c) => ({
          _id: c!._id,
          name: c!.name,
          email: c!.email ?? undefined,
          phone: c!.phone ?? undefined,
          avatarUrl: c!.avatarUrl,
        }));
      navigate("/groups/create", {
        state: {
          formState: {
            ...formState,
            pendingMembers: [...formState.pendingMembers, ...newMembers],
          },
        },
      });
    } else {
      setIsAdding(true);
      try {
        for (const userId of selected) {
          const contact = (contacts ?? []).find((c) => c && c._id === userId);
          if (contact) {
            await addMember({
              groupId: groupId!,
              name: contact.name,
              email: contact.email ?? undefined,
              phone: contact.phone ?? undefined,
            });
          }
        }
        navigate(returnTo || `/groups/${id}`);
      } catch (err) {
        console.error("Failed to add members:", err);
        setIsAdding(false);
      }
    }
  };

  const addContactPath = isCreateFlow
    ? "/groups/create/add-contact"
    : `/groups/${id}/add-contact`;
  const addContactState = isCreateFlow ? { formState } : { returnTo };

  return (
    <MobileShell hideNav>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <button
            onClick={handleCancel}
            className="text-sm font-medium text-brand"
          >
            Cancel
          </button>
          <h1 className="text-base font-bold">Add group members</h1>
          <div className="w-12" />
        </header>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Add a new contact */}
        <Link
          to={addContactPath}
          state={addContactState}
          className="flex items-center gap-3 border-b border-border py-3"
        >
          <div className="flex h-10 w-10 items-center justify-center">
            <UserPlus className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-medium">
            Add a new contact to Splitzer
          </span>
        </Link>

        {/* Contact list */}
        <div className="flex-1 pb-24">
          {contacts === undefined ? (
            <ContactListSkeleton />
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No contacts match your search"
                  : "No known contacts yet. Add a new contact above."}
              </p>
            </div>
          ) : (
            <>
              <p className="pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Friends on Splitzer
              </p>
              <div className="divide-y divide-border">
                {filteredContacts.map((contact) => {
                  if (!contact) return null;
                  const isSelected = selected.has(contact._id);
                  return (
                    <button
                      key={contact._id}
                      onClick={() => toggleSelect(contact._id)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors active:bg-muted/50"
                    >
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 truncate text-sm font-medium">
                        {contact.name}
                      </span>
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-brand bg-brand"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-brand-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Floating done button */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-0 right-0 z-50 mx-auto w-full max-w-md px-4">
            <button
              onClick={handleDone}
              disabled={isAdding}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-medium text-brand-foreground shadow-lg transition-all hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60"
            >
              {isAdding
                ? "Adding..."
                : `Add ${selected.size} member${selected.size > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function ContactListSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
