"use client";

import { FormEvent, useMemo, useState } from "react";
import Alert from "@/components/Alert";
import ConfirmModal from "@/components/ConfirmModal";
import { useLiveData } from "@/components/LiveDataProvider";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { notifyMembersChanged } from "@/lib/liveSync";
import type { Member } from "@/types";

const emptyForm = {
  user_name: "",
  plan_type: "",
  duration_days: "",
  amount: "",
};

export default function MembershipPage() {
  const { members, loading, error, refresh } = useLiveData();
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
    if (!Number.isInteger(days) || days <= 0) {
      setActionError("Number of days must be a positive whole number");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setActionError("Amount must be a valid positive number");
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

    try {
      setDeleting(true);
      setActionError("");
      await api.deleteMembership(pendingDelete.membership_id);
      setPendingDelete(null);
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
              <input
                value={form.plan_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, plan_type: e.target.value }))
                }
                placeholder="Plan type"
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
                placeholder="Days"
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
                placeholder="Amount"
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
