import { prisma } from "../db/prisma";
import { DashboardStats } from "../types";
import { calculateRemainingDays, getManilaDayRange } from "../utils/dates";
import { toMoneyString } from "../utils/money";

export async function getDashboardStats(): Promise<DashboardStats> {
  const { start, end } = getManilaDayRange();

  const [salesAgg, activePlans, members] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: "OPEN",
        paymentDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.membershipPlan.count({ where: { active: true } }),
    prisma.member.findMany({
      include: {
        memberships: {
          orderBy: [{ expirationDate: "desc" }, { id: "desc" }],
          take: 1,
          select: { expirationDate: true },
        },
      },
    }),
  ]);

  let active_members = 0;
  let expired_members = 0;

  for (const member of members) {
    const latest = member.memberships[0];
    if (!latest) continue;
    const expiration = latest.expirationDate.toISOString().slice(0, 10);
    const remaining = calculateRemainingDays(expiration);
    if (remaining > 0) active_members += 1;
    else expired_members += 1;
  }

  return {
    today_sales: toMoneyString(salesAgg._sum.amount?.toString() ?? "0"),
    today_transaction_count: salesAgg._count._all,
    active_members,
    expired_members,
    active_membership_plans: activePlans,
  };
}
