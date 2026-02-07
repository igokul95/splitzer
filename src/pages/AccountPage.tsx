import { useUser, SignOutButton } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, Mail, Phone, Globe } from "lucide-react";

export function AccountPage() {
  const { user: clerkUser } = useUser();
  const viewer = useQuery(api.users.getViewer);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="py-4">
          <h1 className="text-xl font-bold tracking-tight">Account</h1>
        </header>

        {/* Profile Card */}
        <div className="flex flex-col items-center gap-3 py-6">
          {clerkUser?.imageUrl ? (
            <img
              src={clerkUser.imageUrl}
              alt=""
              className="h-20 w-20 rounded-full"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-600 text-2xl font-bold text-white">
              {(viewer?.name ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold">
              {viewer?.name ?? clerkUser?.firstName ?? "User"}
            </p>
          </div>
        </div>

        <Separator />

        {/* Info Section */}
        <div className="space-y-4 py-4">
          {(viewer?.email || clerkUser?.primaryEmailAddress?.emailAddress) && (
            <div className="flex items-center gap-3 px-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {viewer?.email ??
                  clerkUser?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          )}
          {(viewer?.phone || clerkUser?.primaryPhoneNumber?.phoneNumber) && (
            <div className="flex items-center gap-3 px-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {viewer?.phone ??
                  clerkUser?.primaryPhoneNumber?.phoneNumber}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 px-1">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Default currency: {viewer?.defaultCurrency ?? "INR"}
            </span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="py-4">
          <SignOutButton>
            <Button variant="destructive" className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </div>
    </MobileShell>
  );
}
