import { Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import * as memberService from "../services/memberService";

export async function getMembers(_req: Request, res: Response) {
  const members = await memberService.listMembers();
  res.json(members);
}

export async function createMember(req: Request, res: Response) {
  const member = await memberService.registerMember(req.body);
  res.status(201).json(member);
}

export async function renewMembers(req: Request, res: Response) {
  const members = await memberService.renewMembers(req.body);
  res.status(200).json(members);
}

export async function deleteMembership(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid membership id", 400);
  }
  const result = await memberService.deleteMembership(id);
  res.json(result);
}

export async function deleteMember(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Invalid member id", 400);
  }
  const result = await memberService.deleteMember(id);
  res.json(result);
}
