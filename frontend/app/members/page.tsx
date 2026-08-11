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

type StatusFilter = "ALL" | "ACTIVE" | "EXPIRED";

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
  if (filter === "ACTIVE") {
    return liveStatus === "Active" || liveStatus === "ExpiringSoon";
  }
  return liveStatus === "Expired";
}

export default function MembersPage() {
  const { members, now, loading, error, refresh } = useLiveData();
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleMembers = useMemo(() => {
    return members.filter((member) => {
      const liveStatus = getLiveMembershipStatus(member.expiration_date, now);
      return matchesFilter(liveStatus, filter) && matchesSearch(member, search);
    });
  }, [members, filter, search, now]);

  async function confirmDeleteMember() {
    if (!pendingDelete) return;

    try {
      setDeleting(true);
      setActionError("");
      setSuccess("");
      await api.deleteMember(pendingDelete.id);
      setPendingDelete(null);
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
            {(["ALL", "ACTIVE", "EXPIRED"] as StatusFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`filter-btn${filter === value ? " active" : ""}`}
                onClick={() => setFilter(value)}
              >
                {value}
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
          </div>
        </div>

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
        cancelLabel="Cancel"
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDeleteMember}
      />
    </div>
  );
}
