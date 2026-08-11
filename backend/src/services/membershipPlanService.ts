import { Prisma } from "@prisma/client";
import { mapMembershipPlan } from "../db/mappers";
import { prisma } from "../db/prisma";
import { MembershipPlan } from "../types";

export async function listMembershipPlans(
  activeOnly = false
): Promise<MembershipPlan[]> {
  const rows = await prisma.membershipPlan.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map(mapMembershipPlan);
}

export async function createMembershipPlan(input: {
  name: string;
  type: string;
  duration_days: number;
  amount: string;
}): Promise<MembershipPlan> {
  const row = await prisma.membershipPlan.create({
    data: {
      name: input.name.trim(),
      type: input.type.trim(),
      durationDays: input.duration_days,
      amount: new Prisma.Decimal(input.amount),
      active: true,
    },
  });

  return mapMembershipPlan(row);
}

export async function getMembershipPlanById(
  id: number
): Promise<MembershipPlan | null> {
  const row = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!row) return null;
  return mapMembershipPlan(row);
}
