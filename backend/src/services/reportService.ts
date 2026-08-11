import { mapDailySalesReport, mapPayment } from "../db/mappers";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/errorHandler";
import { DailySalesReport, ReportDetail } from "../types";

export async function listReports(): Promise<DailySalesReport[]> {
  const rows = await prisma.dailySalesReport.findMany({
    orderBy: [{ closedAt: "desc" }, { id: "desc" }],
  });
  return rows.map(mapDailySalesReport);
}

export async function getReportById(id: number): Promise<ReportDetail> {
  const report = await prisma.dailySalesReport.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  return {
    ...mapDailySalesReport(report),
    payments: report.payments.map(mapPayment),
  };
}
