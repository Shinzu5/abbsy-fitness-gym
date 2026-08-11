import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import * as reportService from "../services/reportService";

export async function getReports(_req: Request, res: Response) {
  const reports = await reportService.listReports();
  res.json(reports);
}

export async function getReportById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid report id", 400);
  }
  const report = await reportService.getReportById(id);
  res.json(report);
}
