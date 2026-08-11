import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/errorHandler";
import { MemberWithMembership } from "../types";
import {
  calculateExpirationDate,
  calculateRemainingDays,
  formatDateOnly,
  getBusinessDate,
  membershipStatusFromExpiration,
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
    id: number;
    startDate: Date;
    expirationDate: Date;
    amountPaid: Prisma.Decimal;
    plan: { name: string; type: string } | null;
  }>;
}): MemberWithMembership {
  const latest = row.memberships[0] ?? null;
  const expiration = latest ? formatDateOnly(latest.expirationDate) : null;
  const startDate = latest ? formatDateOnly(latest.startDate) : null;
  // Days remaining ALWAYS from expirationDateTime - now (never registration date)
  const remaining_days = expiration ? calculateRemainingDays(expiration) : 0;
  const status = membershipStatusFromExpiration(expiration);

  return {
    id: row.id,
    full_name: row.fullName,
    contact_number: row.contactNumber,
    registered_at: row.registeredAt.toISOString(),
    membership_id: latest?.id ?? null,
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

  const expirationDate = calculateExpirationDate(startDate, input.duration_days);
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

/**
 * Renew one or more members by adding duration_days onto their current plan.
 * Active: expiration = current expiration + days
 * Expired/none: expiration = today + days
 * Creates one new membership + one payment per member.
 */
export async function renewMembers(input: {
  member_ids: number[];
  duration_days: number;
  amount: string;
}): Promise<MemberWithMembership[]> {
  const ids = [...new Set(input.member_ids)].filter(
    (id) => Number.isInteger(id) && id > 0
  );
  if (ids.length === 0) {
    throw new AppError("Select at least one member to renew", 400);
  }
  if (![15, 30].includes(input.duration_days)) {
    throw new AppError("Days must be 15 or 30", 400);
  }

  const planType = input.duration_days === 30 ? "Monthly" : "15 days";
  const amountDecimal = new Prisma.Decimal(input.amount);
  const today = getBusinessDate();
  const todayValue = toDateOnly(today);

  const results: MemberWithMembership[] = [];

  for (const memberId of ids) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        memberships: {
          orderBy: [{ expirationDate: "desc" }, { id: "desc" }],
          take: 1,
          select: { expirationDate: true },
        },
      },
    });

    if (!member) {
      throw new AppError(`Member not found: ${memberId}`, 404);
    }

    const latest = member.memberships[0];
    const currentExp = latest
      ? formatDateOnly(latest.expirationDate)
      : null;
    const remaining = currentExp ? calculateRemainingDays(currentExp) : 0;
    // Add days onto remaining plan when still active; otherwise start from today
    const baseDate = remaining > 0 && currentExp ? currentExp : today;
    const expirationDate = calculateExpirationDate(baseDate, input.duration_days);
    const expirationDateValue = toDateOnly(expirationDate);

    await prisma.$transaction(async (tx) => {
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

      await tx.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          startDate: todayValue,
          expirationDate: expirationDateValue,
          amountPaid: amountDecimal,
        },
      });

      await tx.payment.create({
        data: {
          memberId: member.id,
          customerName: member.fullName,
          description: `Membership renewal - ${planType} (${input.duration_days} days)`,
          amount: amountDecimal,
          notes: `Membership renewal for ${member.fullName}`,
          paymentDate: new Date(),
          status: "OPEN",
        },
      });
    });

    results.push(await getMemberById(member.id));
  }

  return results;
}

/**
 * Manually delete ONE membership row only.
 * Never deletes the member, payments, or reports.
 */
export async function deleteMembership(membershipId: number): Promise<{
  deleted: true;
  membership_id: number;
  member_id: number;
}> {
  if (!Number.isInteger(membershipId) || membershipId <= 0) {
    throw new AppError("Invalid membership id", 400);
  }

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, memberId: true },
  });

  if (!membership) {
    throw new AppError("Membership not found", 404);
  }

  await prisma.membership.delete({
    where: { id: membership.id },
  });

  return {
    deleted: true,
    membership_id: membership.id,
    member_id: membership.memberId,
  };
}

/**
 * Permanently delete a member from Neon.
 * - Deletes all membership rows for that member
 * - Keeps payments (memberId set null) and reports intact
 */
export async function deleteMember(memberId: number): Promise<{
  deleted: true;
  member_id: number;
  full_name: string;
  memberships_deleted: number;
}> {
  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new AppError("Invalid member id", 400);
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, fullName: true },
  });

  if (!member) {
    throw new AppError("Member not found", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const memberships = await tx.membership.deleteMany({
      where: { memberId: member.id },
    });

    // Payments keep customer_name; FK memberId becomes null (onDelete: SetNull)
    await tx.member.delete({
      where: { id: member.id },
    });

    return memberships.count;
  });

  return {
    deleted: true,
    member_id: member.id,
    full_name: member.fullName,
    memberships_deleted: result,
  };
}
