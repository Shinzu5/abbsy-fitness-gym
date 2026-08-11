"use client";

import { useMemo, useState } from "react";
import Alert from "@/components/Alert";
import ConfirmModal from "@/components/ConfirmModal";
import { useLiveData } from "@/components/LiveDataProvider";
import { api } from "@/lib/api";
import {
  formatCountdown,
  getCountdownParts,
  getLiveMembershipStatus,
  type LiveMembershipStatus,
} from "@/lib/countdown";
import { formatDate, formatMoney } from "@/lib/format";
import { notifyMembersChanged } from "@/lib/liveSync";
import type { Member } from "@/types";

type StatusFilter = "ALL" | "ACTIVE" | "EXPIRED" | "EXPIRING_SOON";

const RENEW_OPTIONS = [
  { label: "15 days", days: 15 },
  { label: "Monthly", days: 30 },
] as const;

function isExpiringSoon(status: LiveMembershipStatus): boolean {
  return status === "ExpiringSoon";
}

function memberBadgeClass(status: LiveMembershipStatus): string {
  if (status === "Expired") return "badge badge-expired";
  if (status === "ExpiringSoon") return "badge badge-member-warning";
  if (status === "Active") return "badge badge-member";
  return "badge badge-none";
}

function memberBadgeLabel(status: LiveMembershipStatus): string {
  if (status === "Expired") return "EXPIRED";
  if (status === "None") return "NONE";
  return "MEMBER";
}

function statusBadgeClass(status: LiveMembershipStatus): string {
  if (status === "Expired") return "badge badge-expired";
  if (status === "ExpiringSoon") return "badge badge-expiring";
  if (status === "Active") return "badge badge-active";
  return "badge badge-none";
}

function statusBadgeLabel(status: LiveMembershipStatus): string {
  if (status === "Expired") return "EXPIRED";
  if (status === "ExpiringSoon") return "EXPIRING SOON";
  if (status === "Active") return "ACTIVE";
  return "NONE";
}

function matchesSearch(member: Member, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    member.full_name,
    member.contact_number,
    member.plan_type,
    member.plan_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function matchesFilter(
  liveStatus: LiveMembershipStatus,
  filter: StatusFilter
): boolean {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return liveStatus === "Active";
  if (filter === "EXPIRING_SOON") return liveStatus === "ExpiringSoon";
  return liveStatus === "Expired";
}

function filterLabel(value: StatusFilter): string {
  if (value === "EXPIRING_SOON") return "EXPIRING SOON";
  return value;
}

export default function MembersPage() {
  const { members, now, loading, error, refresh, setMembers } = useLiveData();
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [renewMode, setRenewMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [renewDays, setRenewDays] = useState("15");
  const [renewAmount, setRenewAmount] = useState("");
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const visibleMembers = useMemo(() => {
    return members.filter((member) => {
      const liveStatus = getLiveMembershipStatus(member.expiration_date, now);
      return matchesFilter(liveStatus, filter) && matchesSearch(member, search);
    });
  }, [members, filter, search, now]);

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.includes(m.id)),
    [members, selectedIds]
  );

  function exitRenewMode() {
    setRenewMode(false);
    setSelectedIds([]);
    setRenewDays("15");
    setRenewAmount("");
    setRenewConfirmOpen(false);
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = visibleMembers.map((m) => m.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...visibleIds]))
      );
    }
  }

  function startRenew() {
    setSuccess("");
    setActionError("");
    setRenewMode(true);
    setSelectedIds([]);
    setRenewDays("15");
    setRenewAmount("");
  }

  function requestRenewConfirm() {
    setActionError("");
    if (selectedIds.length === 0) {
      setActionError("Select at least one member to renew");
      return;
    }
    if (!renewDays || ![15, 30].includes(Number(renewDays))) {
      setActionError("Choose 15 days or Monthly");
      return;
    }
    if (!renewAmount || Number(renewAmount) <= 0) {
      setActionError("Amount must be a valid positive number");
      return;
    }
    setRenewConfirmOpen(true);
  }

  async function confirmRenew() {
    try {
      setRenewing(true);
      setActionError("");
      setSuccess("");
      const updated = await api.renewMembers({
        member_ids: selectedIds,
        duration_days: Number(renewDays),
        amount: renewAmount,
      });
      setMembers((prev) => {
        const map = new Map(updated.map((m) => [m.id, m]));
        return prev.map((m) => map.get(m.id) ?? m);
      });
      await refresh(false);
      notifyMembersChanged();
      exitRenewMode();
      setSuccess(
        `Renewed ${updated.length} member${updated.length === 1 ? "" : "s"}. Days added to their plan.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to renew");
      setRenewConfirmOpen(false);
    } finally {
      setRenewing(false);
    }
  }

  async function confirmDeleteMember() {
    if (!pendingDelete) return;

    try {
      setDeleting(true);
      setActionError("");
      setSuccess("");
      const deletedId = pendingDelete.id;
      await api.deleteMember(deletedId);
      setPendingDelete(null);
      setMembers((prev) => prev.filter((m) => m.id !== deletedId));
      await refresh(false);
      notifyMembersChanged();
      setSuccess("Member deleted. Payment and report history were kept.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete member"
      );
    } finally {
      setDeleting(false);
    }
  }

  const allVisibleSelected =
    visibleMembers.length > 0 &&
    visibleMembers.every((m) => selectedIds.includes(m.id));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Members</h2>
          <p>Track registered gym members, renewals, and remaining days.</p>
        </div>
      </div>

      <Alert type="error" message={actionError || error} />
      <Alert type="success" message={success} />

      <div className="panel">
        <div className="panel-title-row">
          <h3>Registered Members</h3>
        </div>

        <div className="members-toolbar">
          <div className="filter-group" role="group" aria-label="Member status filters">
            {(
              ["ALL", "ACTIVE", "EXPIRING_SOON", "EXPIRED"] as StatusFilter[]
            ).map((value) => (
              <button
                key={value}
                type="button"
                className={`filter-btn${filter === value ? " active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {filterLabel(value)}
              </button>
            ))}
          </div>

          <div className="members-search">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact, or plan type"
              aria-label="Search members"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => refresh(false)}
            >
              Search
            </button>
            {!renewMode ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={startRenew}
                disabled={members.length === 0}
              >
                Renew
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={exitRenewMode}
                disabled={renewing}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {renewMode ? (
          <div className="renew-bar">
            <label>
              Renew for
              <select
                value={renewDays}
                onChange={(e) => setRenewDays(e.target.value)}
              >
                {RENEW_OPTIONS.map((opt) => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
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
                value={renewAmount}
                onChange={(e) => setRenewAmount(e.target.value)}
                placeholder="Amount"
              />
            </label>
            <span className="renew-selected">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={requestRenewConfirm}
              disabled={renewing}
            >
              Confirm Renew
            </button>
          </div>
        ) : null}

        {loading ? <p className="loading">Loading members...</p> : null}
        {!loading && members.length === 0 ? (
          <p className="empty">No data yet</p>
        ) : null}
        {!loading && members.length > 0 && visibleMembers.length === 0 ? (
          <p className="empty">No members match this search/filter.</p>
        ) : null}

        {visibleMembers.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {renewMode ? (
                    <th className="renew-check-col">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible members"
                      />
                    </th>
                  ) : null}
                  <th>User Name</th>
                  <th>Plan Type</th>
                  <th>Amount Paid</th>
                  <th>Registration Date</th>
                  <th>Start Date</th>
                  <th>Expiration / Renewal Date</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const liveStatus = getLiveMembershipStatus(
                    member.expiration_date,
                    now
                  );
                  const countdown = getCountdownParts(
                    member.expiration_date,
                    now
                  );

                  return (
                    <tr
                      key={member.id}
                      className={
                        isExpiringSoon(liveStatus) ? "row-expiring" : undefined
                      }
                    >
                      {renewMode ? (
                        <td className="renew-check-col">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(member.id)}
                            onChange={() => toggleSelected(member.id)}
                            aria-label={`Select ${member.full_name}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        <div className="member-name-cell">
                          <span>{member.full_name}</span>
                          <span
                            className={memberBadgeClass(liveStatus)}
                            title={
                              liveStatus === "Expired"
                                ? "Membership expired"
                                : liveStatus === "ExpiringSoon"
                                  ? "Membership expiring soon"
                                  : "Registered gym member"
                            }
                          >
                            {memberBadgeLabel(liveStatus)}
                          </span>
                        </div>
                      </td>
                      <td>{member.plan_type || "—"}</td>
                      <td>{formatMoney(member.amount_paid)}</td>
                      <td>{formatDate(member.registered_at)}</td>
                      <td>{formatDate(member.start_date)}</td>
                      <td>{formatDate(member.expiration_date)}</td>
                      <td className="countdown-cell">
                        {member.expiration_date
                          ? formatCountdown(countdown)
                          : "—"}
                      </td>
                      <td>
                        <span className={statusBadgeClass(liveStatus)}>
                          {statusBadgeLabel(liveStatus)}
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
                          disabled={renewMode}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={pendingDelete != null}
        title="Delete Member?"
        message={
          <>
            <p style={{ marginTop: 0 }}>
              Are you sure you want to permanently delete:
            </p>
            <p>
              <strong>{pendingDelete?.full_name}</strong>?
            </p>
            <p style={{ marginBottom: 0, color: "var(--muted)" }}>
              This action will remove the member and their associated membership
              data from the system. Payment and report history will be kept.
            </p>
          </>
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        cancelLabel="Cancel"
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDeleteMember}
      />

      <ConfirmModal
        open={renewConfirmOpen}
        title="Confirm renewal?"
        message={
          <>
            <p style={{ marginTop: 0 }}>
              Add{" "}
              <strong>
                {Number(renewDays) === 30 ? "Monthly (1 month)" : "15 days"}
              </strong>{" "}
              to {selectedMembers.length} member
              {selectedMembers.length === 1 ? "" : "s"} for{" "}
              <strong>{formatMoney(renewAmount)}</strong> each:
            </p>
            <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
              {selectedMembers.slice(0, 8).map((m) => (
                <li key={m.id}>{m.full_name}</li>
              ))}
              {selectedMembers.length > 8 ? (
                <li>…and {selectedMembers.length - 8} more</li>
              ) : null}
            </ul>
          </>
        }
        confirmLabel="Renew"
        confirmingLabel="Renewing..."
        cancelLabel="Cancel"
        confirmClassName="btn btn-primary"
        confirming={renewing}
        onCancel={() => {
          if (!renewing) setRenewConfirmOpen(false);
        }}
        onConfirm={confirmRenew}
      />
    </div>
  );
}
