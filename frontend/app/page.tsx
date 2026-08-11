"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { DashboardStats } from "@/types";

const emptyStats: DashboardStats = {
  today_sales: "0.00",
  today_transaction_count: 0,
  active_members: 0,
  expired_members: 0,
  active_membership_plans: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await api.getDashboard();
        if (active) setStats(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
          setStats(emptyStats);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Live overview from Neon PostgreSQL.</p>
        </div>
      </div>

      <Alert type="error" message={error} />
      {loading ? <p className="loading">Loading dashboard...</p> : null}

      <div className="grid-stats">
        <StatCard label="Today's Sales" value={formatMoney(stats.today_sales)} />
        <StatCard
          label="Today's Transactions"
          value={stats.today_transaction_count}
        />
        <StatCard label="Active Members" value={stats.active_members} />
        <StatCard label="Expired Members" value={stats.expired_members} />
        <StatCard
          label="Active Membership Plans"
          value={stats.active_membership_plans}
        />
      </div>
    </div>
  );
}
