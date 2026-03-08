import { Plane, Home, Heart, LayoutGrid } from "lucide-react";

const TYPE_ICONS: Record<string, typeof Plane> = {
  trip: Plane,
  home: Home,
  couple: Heart,
  other: LayoutGrid,
};

const TYPE_COLORS: Record<string, string> = {
  trip: "text-orange-400",
  home: "text-brand",
  couple: "text-pink-400",
  other: "text-muted-foreground",
};

interface GroupIconProps {
  type?: string | null;
}

export function GroupIcon({ type }: GroupIconProps) {
  const key = type ?? "other";
  const Icon = TYPE_ICONS[key] ?? LayoutGrid;
  const iconColor = TYPE_COLORS[key] ?? "text-muted-foreground";

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
  );
}
