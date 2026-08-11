import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/errorHandler";
import { MemberWithMembership } from "../types";
import {
  addDaysToDate,
  calculateRemainingDays,
  getBusinessDate,
  toDateOnly,
} from "../utils/dates";
import { toMoneyString } from "../utils/money";

const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;

function mapMember(row: {
  id: number;
  fullName: string;
  contactNumber: string;
  registeredAt: Date;
  memberships: Array<{
    startDate: Date;
    expirationDate: Date;
    amountPaid: Prisma.Decimal;
    plan: { name: string; type: string } | null;
  }>;
}): MemberWithMembership {
  const latest = row.memberships[0] ?? null;
  const expiration = latest
    ? latest.expirationDate.toISOString().slice(0, 10)
    : null;
  const startDate = latest ? latest.startDate.toISOString().slice(0, 10) : null;
  const remaining_days = expiration ? calculateRemainingDays(expiration) : 0;

  let status: "Active" | "Expired" | "None" = "None";
  if (expiration) {
    // Remaining 0 means expired (no negative days displayed)
    status = remaining_days > 0 ? "Active" : "Expired";
  }

  return {
    id: row.id,
    full_name: row.fullName,
    contact_number: row.contactNumber,
    registered_at: row.registeredAt.toISOString(),
    plan_name: latest?.plan?.name ?? null,
    plan_type: latest?.plan?.type ?? null,
    start_date: startDate,
    expiration_date: expiration,
    remaining_days,
    status,
    amount_paid: latest ? toMoneyString(latest.amountPaid.toString()) : null,
  };
}

async function getMemberById(id: number): Promise<MemberWithMembership> {
  const row = await prisma.member.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { plan: true },
        orderBy: [{ expirationDate: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  });

  if (!row) {
    throw new AppError("Member not found", 404);
  }

  return mapMember(row);
}

export async function listMembers(): Promise<MemberWithMembership[]> {
  const rows = await prisma.member.findMany({
    include: {
      memberships: {
        include: { plan: true },
        orderBy: [{ expirationDate: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
    orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
  });

  return rows.map(mapMember);
}

/**
 * Registers a gym user/member from the Membership tab.
 * Creates member + membership + exactly one payment (idempotent on double-submit).
 */
export async function registerMember(input: {
  full_name: string;
  plan_type: string;
  duration_days: number;
  amount: string;
  contact_number?: string | null;
  registration_date?: string | null;
}): Promise<MemberWithMembership> {
  const fullName = input.full_name.trim();
  const planType = input.plan_type.trim();
  const amount = input.amount;
  const contactNumber = (input.contact_number || "-").trim() || "-";

  if (!fullName) {
    throw new AppError("User name is required", 400);
  }
  if (!planType) {
    throw new AppError("Plan type is required", 400);
  }

  const startDate = input.registration_date
    ? String(input.registration_date).slice(0, 10)
    : getBusinessDate();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new AppError("Invalid registration date", 400);
  }

  const expirationDate = addDaysToDate(startDate, input.duration_days);
  const startDateValue = toDateOnly(startDate);
  const expirationDateValue = toDateOnly(expirationDate);
  const amountDecimal = new Prisma.Decimal(amount);
  const idempotencySince = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);

  // Prevent duplicate member + payment on accidental double submit
  const recentDuplicate = await prisma.membership.findFirst({
    where: {
      startDate: startDateValue,
      expirationDate: expirationDateValue,
      amountPaid: amountDecimal,
      createdAt: { gte: idempotencySince },
      plan: { type: { equals: planType, mode: "insensitive" } },
      member: { fullName: { equals: fullName, mode: "insensitive" } },
    },
    select: { memberId: true },
  });

  if (recentDuplicate) {
    return getMemberById(recentDuplicate.memberId);
  }

  const memberId = await prisma.$transaction(async (tx) => {
    // Reuse matching plan catalog row when possible (no schema change)
    let plan = await tx.membershipPlan.findFirst({
      where: {
        type: { equals: planType, mode: "insensitive" },
        durationDays: input.duration_days,
        amount: amountDecimal,
        active: true,
      },
      orderBy: { id: "asc" },
    });

    if (!plan) {
      plan = await tx.membershipPlan.create({
        data: {
          name: planType,
          type: planType,
          durationDays: input.duration_days,
          amount: amountDecimal,
          active: true,
        },
      });
    }

    let member = await tx.member.findFirst({
      where: { fullName: { equals: fullName, mode: "insensitive" } },
      orderBy: { id: "asc" },
    });

    if (!member) {
      member = await tx.member.create({
        data: {
          fullName,
          contactNumber,
          registeredAt: startDateValue,
        },
      });
    }

    // Second check inside transaction against races
    const raced = await tx.membership.findFirst({
      where: {
        memberId: member.id,
        startDate: startDateValue,
        expirationDate: expirationDateValue,
        amountPaid: amountDecimal,
        createdAt: { gte: idempotencySince },
        planId: plan.id,
      },
    });

    if (raced) {
      return member.id;
    }

    await tx.membership.create({
      data: {
        memberId: member.id,
        planId: plan.id,
        startDate: startDateValue,
        expirationDate: expirationDateValue,
        amountPaid: amountDecimal,
      },
    });

    // Exactly one payment for this membership purchase
    await tx.payment.create({
      data: {
        memberId: member.id,
        customerName: member.fullName,
        description: `Membership payment - ${planType} (${input.duration_days} days)`,
        amount: amountDecimal,
        notes: `Membership registration for ${member.fullName}`,
        paymentDate: new Date(),
        status: "OPEN",
      },
    });

    return member.id;
  });

  return getMemberById(memberId);
}
