"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Member } from "@/types";

function isExpiringSoon(member: Member): boolean {
  return (
    member.status === "Active" &&
    member.remaining_days >= 0 &&
    member.remaining_days <= 7
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        setError("");
        const data = await api.getMembers();
        if (active) setMembers(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load members");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Members</h2>
          <p>Track registered gym members, renewals, and remaining days.</p>
        </div>
      </div>

      <Alert type="error" message={error} />

      <div className="panel">
        <h3>Registered Members</h3>
        {loading ? <p className="loading">Loading members...</p> : null}
        {!loading && members.length === 0 ? (
          <p className="empty">No members registered yet.</p>
        ) : null}
        {members.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Plan Type</th>
                  <th>Amount Paid</th>
                  <th>Registration Date</th>
                  <th>Start Date</th>
                  <th>Expiration / Renewal Date</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className={isExpiringSoon(member) ? "row-expiring" : undefined}
                  >
                    <td>{member.full_name}</td>
                    <td>{member.plan_type || "—"}</td>
                    <td>{formatMoney(member.amount_paid)}</td>
                    <td>{formatDate(member.registered_at)}</td>
                    <td>{formatDate(member.start_date)}</td>
                    <td>{formatDate(member.expiration_date)}</td>
                    <td>{member.remaining_days}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          member.status === "Active"
                            ? "active"
                            : member.status === "Expired"
                              ? "expired"
                              : "none"
                        }`}
                      >
                        {member.status === "Active"
                          ? "ACTIVE"
                          : member.status === "Expired"
                            ? "EXPIRED"
                            : member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
