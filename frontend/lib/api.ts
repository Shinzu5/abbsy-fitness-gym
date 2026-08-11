const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const AUTH_EXPIRED_EVENT = "abbsy:auth-expired";

export type AuthUserResponse = {
  id: number;
  username: string;
  expiresAt?: number;
  token?: string;
};

function notifyAuthExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (
      res.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/logout" &&
      path !== "/auth/me"
    ) {
      notifyAuthExpired();
    }
    const message =
      typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  login: (body: { username: string; password: string }) =>
    request<AuthUserResponse & { token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () =>
    request<{ ok: true }>("/auth/logout", {
      method: "POST",
    }),
  me: () => request<AuthUserResponse>("/auth/me"),

  getDashboard: () => request<import("@/types").DashboardStats>("/dashboard"),

  getTodayPayments: () =>
    request<import("@/types").TodayPaymentsResponse>("/payments/today"),
  createPayment: (body: {
    customer_name: string;
    amount: string;
    description: string;
    notes?: string;
    payment_date?: string;
  }) =>
    request<import("@/types").Payment>("/payments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  closeDailySales: () =>
    request<import("@/types").CloseDailySalesResult>("/payments/close-daily", {
      method: "POST",
    }),

  getMembershipPlans: (activeOnly = false) =>
    request<import("@/types").MembershipPlan[]>(
      `/membership-plans${activeOnly ? "?active=true" : ""}`
    ),
  createMembershipPlan: (body: {
    name: string;
    type: string;
    duration_days: number;
    amount: string;
  }) =>
    request<import("@/types").MembershipPlan>("/membership-plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMembers: () => request<import("@/types").Member[]>("/members"),
  createMember: (body: {
    user_name?: string;
    full_name?: string;
    plan_type: string;
    duration_days: number;
    amount: string;
    contact_number?: string;
    registration_date: string;
  }) =>
    request<import("@/types").Member>("/members", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteMember: (id: number) =>
    request<{
      deleted: true;
      member_id: number;
      full_name: string;
      memberships_deleted: number;
    }>(`/members/${id}`, { method: "DELETE" }),
  renewMembers: (body: {
    member_ids: number[];
    duration_days: number;
    amount: string;
  }) =>
    request<import("@/types").Member[]>("/members/renew", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteMembership: (id: number) =>
    request<{ deleted: true; membership_id: number; member_id: number }>(
      `/memberships/${id}`,
      { method: "DELETE" }
    ),

  getReports: () => request<import("@/types").DailySalesReport[]>("/reports"),
  getReport: (id: number) =>
    request<import("@/types").ReportDetail>(`/reports/${id}`),
};
