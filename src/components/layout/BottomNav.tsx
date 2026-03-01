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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium tracking-wide uppercase transition-all ${
                isActive ? "text-brand" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-5 w-5 transition-all ${isActive ? "text-brand" : ""}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span className="text-[10px] tracking-widest">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
