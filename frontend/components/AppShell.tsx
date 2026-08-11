"use client";

import { useState } from "react";
import LiveDataProvider from "./LiveDataProvider";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <LiveDataProvider>
      <div className="app-shell">
        {open ? (
          <div className="backdrop" onClick={() => setOpen(false)} />
        ) : null}
        <Sidebar open={open} onClose={() => setOpen(false)} />
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
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
          {children}
        </main>
      </div>
    </LiveDataProvider>
  );
}
