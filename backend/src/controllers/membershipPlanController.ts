import { Request, Response } from "express";
import * as membershipPlanService from "../services/membershipPlanService";

export async function getMembershipPlans(req: Request, res: Response) {
  const activeOnly = req.query.active === "true";
  const plans = await membershipPlanService.listMembershipPlans(activeOnly);
  res.json(plans);
}

export async function createMembershipPlan(req: Request, res: Response) {
  const plan = await membershipPlanService.createMembershipPlan(req.body);
  res.status(201).json(plan);
}
