import { useUser, SignOutButton } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { LogOut, Mail, Phone, Globe, ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";

export function AccountPage() {
  const { user: clerkUser } = useUser();
  const viewer = useQuery(api.users.getViewer);

  const displayName = viewer?.name ?? clerkUser?.firstName ?? "User";

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        <header className="py-5">
          <h1 className="text-xl">Account</h1>
        </header>

        {/* Profile Card */}
        <div className="mb-3 flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <UserAvatar name={displayName} avatarUrl={viewer?.avatarUrl ?? clerkUser?.imageUrl} size="xl" />
          <div>
            <p className="text-base">{displayName}</p>
            <p className="text-sm text-muted-foreground">
              {viewer?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? ""}
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mb-3 overflow-hidden rounded-lg border border-border bg-card">
          {(viewer?.email || clerkUser?.primaryEmailAddress?.emailAddress) && (
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={viewer?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? ""} />
          )}
          {(viewer?.phone || clerkUser?.primaryPhoneNumber?.phoneNumber) && (
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={viewer?.phone ?? clerkUser?.primaryPhoneNumber?.phoneNumber ?? ""} />
          )}
          <InfoRow icon={<Globe className="h-4 w-4" />} label="Default currency" value={viewer?.defaultCurrency ?? "INR"} last />
        </div>

        {/* Sign out */}
        <SignOutButton>
          <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left text-negative transition-colors hover:bg-negative-light active:opacity-70">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-sm">Sign out</span>
          </button>
        </SignOutButton>
      </div>
    </MobileShell>
  );
}

function InfoRow({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-border" : ""}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
    </div>
  );
}
