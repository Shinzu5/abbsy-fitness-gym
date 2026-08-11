import { Request, Response } from "express";
import * as dashboardService from "../services/dashboardService";

export async function getDashboard(_req: Request, res: Response) {
  const stats = await dashboardService.getDashboardStats();
  res.json(stats);
}
