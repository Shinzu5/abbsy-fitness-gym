export interface Payment {
  id: number;
  member_id: number | null;
  customer_name: string;
  description: string;
  amount: string;
  notes: string | null;
  payment_date: string;
  status: "OPEN" | "CLOSED";
  daily_report_id: number | null;
  created_at: string;
}

export interface TodayPaymentsResponse {
  payments: Payment[];
  total_sales: string;
  transaction_count: number;
}

export interface CloseDailySalesResult {
  closed: boolean;
  message: string;
  report: DailySalesReport | null;
  total_sales: string;
  transaction_count: number;
  closing_date: string | null;
  closing_time: string | null;
}

export interface MembershipPlan {
  id: number;
  name: string;
  type: string;
  duration_days: number;
  amount: string;
  created_at: string;
  active: boolean;
}

export interface Member {
  id: number;
  full_name: string;
  contact_number: string;
  registered_at: string;
  membership_id: number | null;
  plan_name: string | null;
  plan_type: string | null;
  start_date: string | null;
  expiration_date: string | null;
  remaining_days: number;
  status: "Active" | "Expired" | "None";
  amount_paid: string | null;
}

export interface DailySalesReport {
  id: number;
  report_date: string;
  total_sales: string;
  transaction_count: number;
  closed_at: string;
}

export interface ReportDetail extends DailySalesReport {
  payments: Payment[];
}

export interface DashboardStats {
  today_sales: string;
  today_transaction_count: number;
  active_members: number;
  expired_members: number;
  active_membership_plans: number;
}
