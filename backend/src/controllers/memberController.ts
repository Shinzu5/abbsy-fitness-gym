import { Request, Response } from "express";
import * as memberService from "../services/memberService";

export async function getMembers(_req: Request, res: Response) {
  const members = await memberService.listMembers();
  res.json(members);
}

export async function createMember(req: Request, res: Response) {
  const member = await memberService.registerMember(req.body);
  res.status(201).json(member);
}
