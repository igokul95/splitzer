function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  /** "md" = 40px (default), "lg" = 56px */
  size?: "md" | "lg";
}

export function UserAvatar({ name, avatarUrl, size = "md" }: UserAvatarProps) {
  const dim = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const text = size === "lg" ? "text-base" : "text-sm";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${dim} shrink-0 rounded-full object-cover${size === "lg" ? " ring-1 ring-border" : ""}`}
      />
    );
  }

  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full ${text} bg-muted text-muted-foreground`}
    >
      {getInitials(name)}
    </div>
  );
}
