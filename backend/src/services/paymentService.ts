import { Prisma } from "@prisma/client";
import { mapDailySalesReport, mapPayment } from "../db/mappers";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/errorHandler";
import { CloseDailySalesResult, Payment } from "../types";
import {
  formatClosingParts,
  getBusinessDate,
  getManilaDayRange,
} from "../utils/dates";
import { toMoneyString } from "../utils/money";

export async function listPayments(status?: "OPEN" | "CLOSED"): Promise<Payment[]> {
  const rows = await prisma.payment.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
  });
  return rows.map(mapPayment);
}

export async function getTodayOpenPayments(): Promise<{
  payments: Payment[];
  total_sales: string;
  transaction_count: number;
}> {
  const { start, end } = getManilaDayRange();

  const rows = await prisma.payment.findMany({
    where: {
      status: "OPEN",
      paymentDate: { gte: start, lte: end },
    },
    orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
  });

  const total = rows.reduce((sum, p) => sum + Number(p.amount.toString()), 0);

  return {
    payments: rows.map(mapPayment),
    total_sales: toMoneyString(total),
    transaction_count: rows.length,
  };
}

export async function createPayment(input: {
  customer_name: string;
  amount: string;
  description: string;
  notes?: string | null;
  payment_date?: string | null;
  member_id?: number | null;
}): Promise<Payment> {
  const paymentDate = input.payment_date
    ? new Date(input.payment_date)
    : new Date();

  if (Number.isNaN(paymentDate.getTime())) {
    throw new AppError("Invalid payment date/time", 400);
  }

  const row = await prisma.payment.create({
    data: {
      memberId: input.member_id ?? null,
      customerName: input.customer_name.trim(),
      description: input.description.trim(),
      amount: new Prisma.Decimal(input.amount),
      notes: input.notes?.trim() || null,
      paymentDate,
      status: "OPEN",
    },
  });

  return mapPayment(row);
}

export async function closeDailySales(): Promise<CloseDailySalesResult> {
  const businessDate = getBusinessDate();
  const { start, end } = getManilaDayRange(businessDate);

  return prisma.$transaction(async (tx) => {
    // Lock today's open payments so concurrent closes cannot double-count
    const openPayments = await tx.$queryRaw<
      Array<{
        id: number;
        amount: Prisma.Decimal;
      }>
    >`
      SELECT id, amount
      FROM payments
      WHERE status = 'OPEN'
        AND payment_date >= ${start}
        AND payment_date <= ${end}
      ORDER BY id
      FOR UPDATE
    `;

    if (openPayments.length === 0) {
      return {
        closed: false,
        message: "No open payments to close for today.",
        report: null,
        total_sales: "0.00",
        transaction_count: 0,
        closing_date: null,
        closing_time: null,
      };
    }

    const totalSales = toMoneyString(
      openPayments.reduce((sum, p) => sum + Number(p.amount.toString()), 0)
    );
    const transactionCount = openPayments.length;
    const paymentIds = openPayments.map((p) => p.id);

    const report = await tx.dailySalesReport.create({
      data: {
        reportDate: new Date(`${businessDate}T00:00:00.000Z`),
        totalSales: new Prisma.Decimal(totalSales),
        transactionCount,
        closedAt: new Date(),
      },
    });

    await tx.payment.updateMany({
      where: {
        id: { in: paymentIds },
        status: "OPEN",
      },
      data: {
        status: "CLOSED",
        dailyReportId: report.id,
      },
    });

    const mappedReport = mapDailySalesReport(report);
    const { closing_date, closing_time } = formatClosingParts(report.closedAt);

    return {
      closed: true,
      message: "Daily sales closed successfully.",
      report: mappedReport,
      total_sales: mappedReport.total_sales,
      transaction_count: mappedReport.transaction_count,
      closing_date,
      closing_time,
    };
  });
}
