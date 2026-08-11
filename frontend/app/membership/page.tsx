"use client";

import { FormEvent, useMemo, useState } from "react";
import Alert from "@/components/Alert";
import ConfirmModal from "@/components/ConfirmModal";
import { useLiveData } from "@/components/LiveDataProvider";
import { api } from "@/lib/api";
import { formatDate, formatMoney, toLocalInputDate } from "@/lib/format";
import { notifyMembersChanged } from "@/lib/liveSync";
import type { Member } from "@/types";

/** Fixed plan type dropdown options. */
const PLAN_OPTIONS = [
  { label: "Monthly", value: "Monthly", days: 30 },
  { label: "15 days", value: "15 days", days: 15 },
] as const;

const DURATION_OPTIONS = [15, 30] as const;

const emptyForm: {
  user_name: string;
  plan_type: string;
  start_date: string;
  duration_days: string;
  amount: string;
} = {
  user_name: "",
  plan_type: "",
  start_date: toLocalInputDate(),
  duration_days: "",
  amount: "",
};

function daysForPlanType(planType: string): number {
  const match = PLAN_OPTIONS.find((p) => p.value === planType);
  return match?.days ?? 15;
}

function planTypeForDays(days: number): string {
  const match = PLAN_OPTIONS.find((p) => p.days === days);
  return match?.value ?? PLAN_OPTIONS[0].value;
}

function addDaysToDate(startDate: string, days: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monthly (30) = +1 calendar month (7/13 → 8/13). Other durations = +days. */
function calculateExpirationDate(startDate: string, durationDays: number): string {
  if (durationDays === 30) {
    const [year, month, day] = startDate.slice(0, 10).split("-").map(Number);
    const targetMonthIndex = month - 1 + 1;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDay = new Date(
      Date.UTC(targetYear, normalizedMonth + 1, 0)
    ).getUTCDate();
    const clampedDay = Math.min(day, lastDay);
    return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay))
      .toISOString()
      .slice(0, 10);
  }
  return addDaysToDate(startDate, durationDays);
}

export default function MembershipPage() {
  const { members, loading, error, refresh, setMembers } = useLiveData();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);

  const membershipRows = useMemo(
    () => members.filter((m) => m.membership_id != null),
    [members]
  );

  const expirationPreview = useMemo(() => {
    const days = Number(form.duration_days);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.start_date)) return null;
    if (!Number.isInteger(days) || days <= 0) return null;
    return calculateExpirationDate(form.start_date, days);
  }, [form.start_date, form.duration_days]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setActionError("");
    setSuccess("");

    const days = Number(form.duration_days);
    if (!form.user_name.trim()) {
      setActionError("User name is required");
      return;
    }
    if (!form.plan_type.trim()) {
      setActionError("Plan type is required");
      return;
    }
    if (!form.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(form.start_date)) {
      setActionError("Start date is required");
      return;
    }
    const startParsed = new Date(`${form.start_date}T00:00:00Z`);
    if (
      Number.isNaN(startParsed.getTime()) ||
      startParsed.toISOString().slice(0, 10) !== form.start_date
    ) {
      setActionError("Start date must be a valid date");
      return;
    }
    if (!Number.isInteger(days) || days <= 0) {
      setActionError("Days is required");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setActionError("Amount must be a valid positive number");
      return;
    }

    try {
      setSubmitting(true);
      const created = await api.createMember({
        user_name: form.user_name.trim(),
        full_name: form.user_name.trim(),
        plan_type: form.plan_type.trim(),
        duration_days: days,
        amount: form.amount,
        registration_date: form.start_date,
      });
      // Instant Members / Dashboard / bell update (shared LiveDataProvider)
      setMembers((prev) => {
        const others = prev.filter((m) => m.id !== created.id);
        return [created, ...others];
      });
      setForm({ ...emptyForm, start_date: toLocalInputDate() });
      await refresh(false);
      notifyMembersChanged();
      setSuccess(
        "Member registered. One payment was added to today's Payments."
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to register membership"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete?.membership_id) return;
    const target = pendingDelete;

    try {
      setDeleting(true);
      setActionError("");
      await api.deleteMembership(target.membership_id!);
      setPendingDelete(null);
      // Instant Dashboard update while API refresh reconciles
      setMembers((prev) =>
        prev.map((m) =>
          m.id === target.id
            ? {
                ...m,
                membership_id: null,
                plan_name: null,
                plan_type: null,
                start_date: null,
                expiration_date: null,
                remaining_days: 0,
                status: "None",
                amount_paid: null,
              }
            : m
        )
      );
      await refresh(false);
      notifyMembersChanged();
      setSuccess("Membership deleted. Member and payment history were kept.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete membership"
      );
    } finally {
      setDeleting(false);
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

      <Alert type="error" message={actionError || error} />
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
                placeholder="Full name"
                required
              />
            </label>
            <label>
              Plan Type
              <select
                value={form.plan_type}
                onChange={(e) => {
                  const plan_type = e.target.value;
                  setForm((p) => ({
                    ...p,
                    plan_type,
                    duration_days: plan_type
                      ? String(daysForPlanType(plan_type))
                      : "",
                  }));
                }}
                required
              >
                <option value="" disabled>
                  Select plan type
                </option>
                {PLAN_OPTIONS.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start Date
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, start_date: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Days
              <select
                value={form.duration_days}
                onChange={(e) => {
                  const duration_days = e.target.value;
                  const days = Number(duration_days);
                  setForm((p) => ({
                    ...p,
                    duration_days,
                    plan_type: duration_days ? planTypeForDays(days) : "",
                  }));
                }}
                required
              >
                <option value="" disabled>
                  Select days
                </option>
                {DURATION_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
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
                placeholder="Amount"
                required
              />
            </label>
            <label>
              Expiration
              <input
                type="text"
                value={
                  expirationPreview ? formatDate(expirationPreview) : "—"
                }
                readOnly
                tabIndex={-1}
                aria-live="polite"
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
        {!loading && membershipRows.length === 0 ? (
          <p className="empty">No memberships yet</p>
        ) : null}
        {membershipRows.length > 0 ? (
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {membershipRows.map((member) => (
                  <tr key={`${member.id}-${member.membership_id}`}>
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
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          setSuccess("");
                          setPendingDelete(member);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={pendingDelete != null}
        title="Delete this membership?"
        message="Are you sure you want to delete this membership? The member and payment history will be kept."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
