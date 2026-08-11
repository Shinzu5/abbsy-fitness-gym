"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import LiveDataProvider from "./LiveDataProvider";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  async function onLogout() {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <LiveDataProvider>
      <div className="app-shell">
        {open ? (
          <div className="backdrop" onClick={() => setOpen(false)} />
        ) : null}
        <Sidebar open={open} onClose={() => setOpen(false)} onLogout={onLogout} />
        <main className="main">
          <div className="topbar">
            <button
              type="button"
              className="btn btn-secondary mobile-toggle"
              onClick={() => setOpen(true)}
            >
              Menu
            </button>
            <div className="topbar-actions">
              {user ? (
                <span className="topbar-user" title={user.username}>
                  {user.username}
                </span>
              ) : null}
              <NotificationBell />
              <ThemeToggle />
              <button
                type="button"
                className="btn btn-ghost logout-btn"
                onClick={onLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
          {children}
        </main>
      </div>
    </LiveDataProvider>
  );
}
