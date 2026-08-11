"use client";

import { FormEvent, useEffect, useState } from "react";
import Alert from "@/components/Alert";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Member } from "@/types";

const emptyForm = {
  user_name: "",
  plan_type: "",
  duration_days: "",
  amount: "",
};

export default function MembershipPage() {
  const [form, setForm] = useState(emptyForm);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadMembers() {
    const data = await api.getMembers();
    setMembers(data);
  }

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        setError("");
        await loadMembers();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load memberships"
          );
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const days = Number(form.duration_days);
    if (!form.user_name.trim()) {
      setError("User name is required");
      return;
    }
    if (!form.plan_type.trim()) {
      setError("Plan type is required");
      return;
    }
    if (!Number.isInteger(days) || days <= 0) {
      setError("Number of days must be a positive whole number");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    try {
      setSubmitting(true);
      await api.createMember({
        user_name: form.user_name.trim(),
        full_name: form.user_name.trim(),
        plan_type: form.plan_type.trim(),
        duration_days: days,
        amount: form.amount,
      });
      setForm(emptyForm);
      await loadMembers();
      setSuccess(
        "Member registered. One payment was added to today's Payments."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register membership"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Membership</h2>
          <p>
            Register a gym user/member. This creates the member record and one
            payment.
          </p>
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="panel">
        <h3>Add Membership</h3>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              User Name
              <input
                value={form.user_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, user_name: e.target.value }))
                }
                placeholder="John Doe"
                required
              />
            </label>
            <label>
              Plan Type
              <input
                value={form.plan_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, plan_type: e.target.value }))
                }
                placeholder="Monthly"
                required
              />
            </label>
            <label>
              Number of Days
              <input
                type="number"
                min="1"
                step="1"
                value={form.duration_days}
                onChange={(e) =>
                  setForm((p) => ({ ...p, duration_days: e.target.value }))
                }
                placeholder="30"
                required
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                placeholder="350.00"
                required
              />
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Add Membership"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>Registered Memberships</h3>
        {loading ? <p className="loading">Loading memberships...</p> : null}
        {!loading && members.length === 0 ? (
          <p className="empty">No memberships registered yet.</p>
        ) : null}
        {members.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Plan Type</th>
                  <th>Amount</th>
                  <th>Start Date</th>
                  <th>Expiration</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.full_name}</td>
                    <td>{member.plan_type || "—"}</td>
                    <td>{formatMoney(member.amount_paid)}</td>
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
