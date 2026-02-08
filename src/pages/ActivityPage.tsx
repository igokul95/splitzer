import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MobileShell } from "@/components/layout/MobileShell";
import { formatCurrency } from "@/lib/format";
import { Receipt, Activity } from "lucide-react";

export function ActivityPage() {
  const navigate = useNavigate();
  const activities = useQuery(api.activities.getMyActivities);

  return (
    <MobileShell>
      <div className="flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="py-4">
          <h1 className="text-lg font-semibold">Recent activity</h1>
        </header>

        {/* Content */}
        {activities === undefined ? (
          <LoadingSkeleton />
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <ActivityList activities={activities} />
        )}
      </div>

      {/* FAB */}
      {activities && activities.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            className="flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95"
            onClick={() => navigate("/expenses/add")}
          >
            <Receipt className="h-4 w-4" />
            Add expense
          </button>
        </div>
      )}
    </MobileShell>
  );
}

import { FunctionReturnType } from "convex/server";

type ActivityItem = FunctionReturnType<
  typeof api.activities.getMyActivities
>[number];

function ActivityList({ activities }: { activities: ActivityItem[] }) {
  // Group by month-year
  const grouped: Record<string, ActivityItem[]> = {};
  activities.forEach((a) => {
    const key = new Date(a.createdAt).toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
    (grouped[key] ||= []).push(a);
  });

  return (
    <div className="pb-24">
      {Object.entries(grouped).map(([monthYear, items]) => (
        <div key={monthYear}>
          <h3 className="px-0 py-3 text-sm font-semibold text-foreground">
            {monthYear}
          </h3>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <ActivityItemRow key={item._id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const relativeTime = getRelativeTime(item.createdAt);

  const { description, involvementText, involvementColor } =
    getActivityDisplay(item);

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
        {item.actorAvatarUrl ? (
          <img
            src={item.actorAvatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          item.actorName[0]?.toUpperCase()
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm">{description}</p>
        {involvementText && (
          <p className={`mt-0.5 text-sm font-semibold ${involvementColor}`}>
            {involvementText}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime}</p>
      </div>
    </div>
  );
}

function getActivityDisplay(item: ActivityItem): {
  description: string;
  involvementText: string;
  involvementColor: string;
} {
  const { type, actorName, groupName, metadata, myAmount } = item;
  const inGroup = groupName ? ` in "${groupName}"` : "";

  switch (type) {
    case "expense_added": {
      const desc = metadata?.description ?? "an expense";
      const description = `${actorName} added "${desc}"${inGroup}`;
      let involvementText = "";
      let involvementColor = "";

      if (myAmount !== undefined && Math.abs(myAmount) > 0.005) {
        const currency = metadata?.currency ?? "INR";
        if (myAmount < 0) {
          // I owe (negative = my owedAmount > paidAmount)
          involvementText = `You owe ${formatCurrency(Math.abs(myAmount), currency)}`;
          involvementColor = "text-orange-600";
        } else {
          involvementText = `You get back ${formatCurrency(myAmount, currency)}`;
          involvementColor = "text-teal-600";
        }
      }

      return { description, involvementText, involvementColor };
    }

    case "expense_deleted": {
      const desc = metadata?.description ?? "an expense";
      return {
        description: `${actorName} deleted "${desc}"${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
    }

    case "settlement": {
      const amount = metadata?.totalAmount ?? 0;
      const currency = metadata?.currency ?? "INR";
      const payerName = metadata?.paidByName ?? "Someone";
      const payeeName = metadata?.settlementToName ?? "someone";
      return {
        description: `${payerName} paid ${payeeName} ${formatCurrency(amount, currency)}${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
    }

    case "member_added": {
      const memberName = metadata?.memberName ?? "someone";
      return {
        description: `${actorName} added ${memberName} to the group${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
    }

    case "member_removed": {
      const memberName = metadata?.memberName ?? "someone";
      return {
        description: `${actorName} removed ${memberName} from the group${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
    }

    case "group_created": {
      const name = metadata?.description ?? "a group";
      return {
        description: `${actorName} created the group "${name}"`,
        involvementText: "",
        involvementColor: "",
      };
    }

    case "group_updated": {
      const name = metadata?.description ?? "the group";
      return {
        description: `${actorName} updated "${name}"${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
    }

    case "expense_updated": {
      const desc = metadata?.description ?? "an expense";
      return {
        description: `${actorName} updated "${desc}"${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
    }

    default:
      return {
        description: `${actorName} performed an action${inGroup}`,
        involvementText: "",
        involvementColor: "",
      };
  }
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Activity className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">No activity yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your recent activity across all groups will appear here.
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
