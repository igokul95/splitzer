import { MobileShell } from "@/components/layout/MobileShell";
import { Users } from "lucide-react";

export function FriendsPage() {
  return (
    <MobileShell>
      <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Friends</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your friends and balances will appear here once you start splitting
            expenses.
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
