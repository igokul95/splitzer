import { MobileShell } from "@/components/layout/MobileShell";
import { Activity } from "lucide-react";

export function ActivityPage() {
  return (
    <MobileShell>
      <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Activity className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your recent activity across all groups will appear here.
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
