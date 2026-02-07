import { NavLink } from "react-router-dom";
import { Users, User, Activity, UserCircle } from "lucide-react";

const NAV_ITEMS = [
  { to: "/friends", label: "Friends", icon: User },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/account", label: "Account", icon: UserCircle },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive
                  ? "text-teal-600 font-medium"
                  : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-5 w-5 ${isActive ? "fill-teal-600/20 stroke-teal-600" : ""}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
