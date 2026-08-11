"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import {
  getCountdownParts,
  getLiveMembershipStatus,
  type LiveMembershipStatus,
} from "@/lib/countdown";
import { subscribeMembersChanged } from "@/lib/liveSync";
import type { DashboardStats, Member } from "@/types";

const emptyStats: DashboardStats = {
  today_sales: "0.00",
  today_transaction_count: 0,
  active_members: 0,
  expired_members: 0,
  active_membership_plans: 0,
};

export type ExpiringNotification = {
  id: number;
  full_name: string;
  expiration_date: string | null;
  status: LiveMembershipStatus;
  countdownLabel: string;
};

type LiveDataContextValue = {
  members: Member[];
  stats: DashboardStats;
  now: Date;
  loading: boolean;
  error: string;
  refresh: (showLoading?: boolean) => Promise<void>;
  activeMembers: number;
  expiredMembers: number;
  expiringNotifications: ExpiringNotification[];
};

const LiveDataContext = createContext<LiveDataContextValue | null>(null);

export default function LiveDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const [memberRows, dashboard] = await Promise.all([
        api.getMembers(),
        api.getDashboard(),
      ]);
      setMembers(memberRows);
      setStats(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live data");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(true);

    const unsubscribe = subscribeMembersChanged(() => {
      refresh(false);
    });

    function onFocus() {
      if (document.visibilityState === "visible") {
        refresh(false);
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  // Local clock for live membership status / notifications (no Neon polling)
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { activeMembers, expiredMembers, expiringNotifications } = useMemo(() => {
    let active = 0;
    let expired = 0;
    const notifications: ExpiringNotification[] = [];

    for (const member of members) {
      const status = getLiveMembershipStatus(member.expiration_date, now);
      if (status === "Active" || status === "ExpiringSoon") active += 1;
      if (status === "Expired") expired += 1;

      if (status === "ExpiringSoon" && member.expiration_date) {
        const parts = getCountdownParts(member.expiration_date, now);
        notifications.push({
          id: member.id,
          full_name: member.full_name,
          expiration_date: member.expiration_date,
          status,
          countdownLabel: `${parts.days}d ${String(parts.hours).padStart(2, "0")}h ${String(parts.minutes).padStart(2, "0")}m`,
        });
      }
    }

    notifications.sort((a, b) =>
      String(a.expiration_date).localeCompare(String(b.expiration_date))
    );

    return {
      activeMembers: active,
      expiredMembers: expired,
      expiringNotifications: notifications,
    };
  }, [members, now]);

  const value = useMemo<LiveDataContextValue>(
    () => ({
      members,
      stats: {
        ...stats,
        // Keep dashboard member cards in sync with live membership status
        active_members: activeMembers,
        expired_members: expiredMembers,
      },
      now,
      loading,
      error,
      refresh,
      activeMembers,
      expiredMembers,
      expiringNotifications,
    }),
    [
      members,
      stats,
      now,
      loading,
      error,
      refresh,
      activeMembers,
      expiredMembers,
      expiringNotifications,
    ]
  );

  return (
    <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error("useLiveData must be used within LiveDataProvider");
  }
  return ctx;
}
