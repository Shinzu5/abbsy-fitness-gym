import { Prisma } from "@prisma/client";
import {
  DailySalesReport,
  MembershipPlan,
  Payment,
  PaymentStatus,
} from "../types";
import { toMoneyString } from "../utils/money";

function asIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function asDateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function money(value: Prisma.Decimal | string | number): string {
  return toMoneyString(value.toString());
}

export function mapPayment(row: {
  id: number;
  memberId: number | null;
  customerName: string;
  description: string;
  amount: Prisma.Decimal;
  notes: string | null;
  paymentDate: Date;
  status: string;
  dailyReportId: number | null;
  createdAt: Date;
}): Payment {
  return {
    id: row.id,
    member_id: row.memberId,
    customer_name: row.customerName,
    description: row.description,
    amount: money(row.amount),
    notes: row.notes,
    payment_date: asIso(row.paymentDate),
    status: row.status as PaymentStatus,
    daily_report_id: row.dailyReportId,
    created_at: asIso(row.createdAt),
  };
}

export function mapMembershipPlan(row: {
  id: number;
  name: string;
  type: string;
  durationDays: number;
  amount: Prisma.Decimal;
  createdAt: Date;
  active: boolean;
}): MembershipPlan {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    duration_days: row.durationDays,
    amount: money(row.amount),
    created_at: asIso(row.createdAt),
    active: row.active,
  };
}

export function mapDailySalesReport(row: {
  id: number;
  reportDate: Date;
  totalSales: Prisma.Decimal;
  transactionCount: number;
  closedAt: Date;
}): DailySalesReport {
  return {
    id: row.id,
    report_date: asDateOnly(row.reportDate),
    total_sales: money(row.totalSales),
    transaction_count: row.transactionCount,
    closed_at: asIso(row.closedAt),
  };
}
