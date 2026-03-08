import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { ExpenseFab } from "@/components/expenses/ExpenseFab";
import { formatCurrency } from "@/lib/format";
import { Activity } from "lucide-react";
import { FunctionReturnType } from "convex/server";
import { UserAvatar } from "@/components/shared/UserAvatar";

type ActivityItem = FunctionReturnType<typeof api.activities.getMyActivities>[number];

export function ActivityPage() {
  const activities = useQuery(api.activities.getMyActivities);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        <header className="py-5">
          <h1 className="text-xl">Activity</h1>
        </header>

        {activities === undefined ? <LoadingSkeleton /> : activities.length === 0 ? <EmptyState /> : <ActivityList activities={activities} />}
      </div>

      {activities && activities.length > 0 && <ExpenseFab position="tabbed" />}
    </MobileShell>
  );
}

function ActivityList({ activities }: { activities: ActivityItem[] }) {
  const grouped: Record<string, ActivityItem[]> = {};
  activities.forEach((a) => {
    const key = new Date(a.createdAt).toLocaleDateString("en", { month: "long", year: "numeric" });
    (grouped[key] ||= []).push(a);
  });

  return (
    <div className="pb-24">
      {Object.entries(grouped).map(([monthYear, items]) => (
        <div key={monthYear} className="mb-4">
          <h3 className="pb-2 pt-1 text-xs text-muted-foreground/70">
            {monthYear}
          </h3>
          <div className="divide-y divide-border">
            {items.map((item) => <ActivityItemRow key={item._id} item={item} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const relativeTime = getRelativeTime(item.createdAt);
  const timeOfDay = new Date(item.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  const { description, involvementText, involvementColor } = getActivityDisplay(item);

  return (
    <div className="flex items-start gap-3 py-3.5">
      <div className="mt-0.5 shrink-0">
        <UserAvatar name={item.actorName} avatarUrl={item.actorAvatarUrl} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug text-foreground">{description}</p>
        {involvementText && (
          <p className={`text-[13px] ${involvementColor}`}>{involvementText}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">{relativeTime}</p>
        <p className="text-xs text-muted-foreground/60">{timeOfDay}</p>
      </div>
    </div>
  );
}

function getActivityDisplay(item: ActivityItem): { description: string; involvementText: string; involvementColor: string } {
  const { type, actorName, groupName, metadata, myAmount } = item;
  const inGroup = groupName ? ` in "${groupName}"` : "";

  switch (type) {
    case "expense_added": {
      const desc = metadata?.description ?? "an expense";
      let involvementText = "";
      let involvementColor = "";
      if (myAmount !== undefined && Math.abs(myAmount) > 0.005) {
        const currency = metadata?.currency ?? "INR";
        if (myAmount > 0) {
          involvementText = `You owe ${formatCurrency(myAmount, currency)}`;
          involvementColor = "text-negative";
        } else {
          involvementText = `You get back ${formatCurrency(Math.abs(myAmount), currency)}`;
          involvementColor = "text-positive";
        }
      }
      return { description: `${actorName} added "${desc}"${inGroup}`, involvementText, involvementColor };
    }
    case "expense_deleted": {
      const desc = metadata?.description ?? "an expense";
      return { description: `${actorName} deleted "${desc}"${inGroup}`, involvementText: "", involvementColor: "" };
    }
    case "settlement": {
      const amount = metadata?.totalAmount ?? 0;
      const currency = metadata?.currency ?? "INR";
      const payerName = metadata?.paidByName ?? "Someone";
      const payeeName = metadata?.settlementToName ?? "someone";
      return { description: `${payerName} paid ${payeeName} ${formatCurrency(amount, currency)}${inGroup}`, involvementText: "", involvementColor: "" };
    }
    case "member_added": return { description: `${actorName} added ${metadata?.memberName ?? "someone"} to the group${inGroup}`, involvementText: "", involvementColor: "" };
    case "member_removed": return { description: `${actorName} removed ${metadata?.memberName ?? "someone"} from the group${inGroup}`, involvementText: "", involvementColor: "" };
    case "group_created": return { description: `${actorName} created the group "${metadata?.description ?? "a group"}"`, involvementText: "", involvementColor: "" };
    case "group_updated": return { description: `${actorName} updated "${metadata?.description ?? "the group"}"${inGroup}`, involvementText: "", involvementColor: "" };
    case "expense_updated": return { description: `${actorName} updated "${metadata?.description ?? "an expense"}"${inGroup}`, involvementText: "", involvementColor: "" };
    default: return { description: `${actorName} performed an action${inGroup}`, involvementText: "", involvementColor: "" };
  }
}

function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-card">
        <Activity className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black">No activity yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your recent activity will appear here.</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="py-4">
      <div className="h-4 w-24 animate-pulse rounded bg-muted mb-3" />
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-3 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
