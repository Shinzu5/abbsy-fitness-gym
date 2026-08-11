"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/payments", label: "Payments" },
  { href: "/membership", label: "Membership" },
  { href: "/members", label: "Members" },
  { href: "/reports", label: "Reports" },
];

export default function Sidebar({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="brand">
        <p className="brand-kicker">Gym Management</p>
        <h1>ABBSY FITNESS GYM</h1>
      </div>
      <nav className="nav">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? "active" : undefined}
              onClick={onClose}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button
          type="button"
          className="btn btn-ghost logout-btn sidebar-logout"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
