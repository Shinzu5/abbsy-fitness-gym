"use client";

import Alert from "@/components/Alert";
import { useLiveData } from "@/components/LiveDataProvider";
import StatCard from "@/components/StatCard";
import { formatMoney } from "@/lib/format";

export default function DashboardPage() {
  const { stats, loading, error } = useLiveData();

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
