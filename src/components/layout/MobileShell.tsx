import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface MobileShellProps {
  children: ReactNode;
  /** Hide the bottom navigation bar (e.g. for auth pages, detail pages) */
  hideNav?: boolean;
}

export function MobileShell({ children, hideNav = false }: MobileShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <div
        className={`mx-auto w-full max-w-md ${hideNav ? "pb-[env(safe-area-inset-bottom)]" : "pb-16"}`}
      >
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
