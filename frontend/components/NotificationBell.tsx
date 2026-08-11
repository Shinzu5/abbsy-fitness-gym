"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveData } from "./LiveDataProvider";

export default function NotificationBell() {
  const { expiringNotifications } = useLiveData();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const count = expiringNotifications.length;

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-btn"
        aria-label="Membership notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">🔔</span>
        {count > 0 ? <span className="notification-badge">{count}</span> : null}
      </button>

      {open ? (
        <div className="notification-panel" role="dialog" aria-label="Expiring memberships">
          <div className="notification-panel-header">
            Expiring Soon ({count})
          </div>
          {count === 0 ? (
            <p className="notification-empty">No expiring memberships</p>
          ) : (
            <ul className="notification-list">
              {expiringNotifications.map((item) => (
                <li key={item.id}>
                  <strong>{item.full_name}</strong>
                  <span>{item.countdownLabel} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
