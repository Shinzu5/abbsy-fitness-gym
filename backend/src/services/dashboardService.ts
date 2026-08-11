import { prisma } from "../db/prisma";
import { DashboardStats } from "../types";
import {
  calculateRemainingDays,
  formatDateOnly,
  getManilaDayRange,
  membershipStatusFromExpiration,
} from "../utils/dates";
import { toMoneyString } from "../utils/money";

export async function getDashboardStats(): Promise<DashboardStats> {
  const { start, end } = getManilaDayRange();

  const [salesAgg, members] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: "OPEN",
        paymentDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.member.findMany({
      include: {
        memberships: {
          orderBy: [{ expirationDate: "desc" }, { id: "desc" }],
          take: 1,
          select: { expirationDate: true, planId: true },
        },
      },
    }),
  ]);

  let active_members = 0;
  let expired_members = 0;
  const activePlanIds = new Set<number>();

  for (const member of members) {
    const latest = member.memberships[0];
    if (!latest) continue;
    const expiration = formatDateOnly(latest.expirationDate);
    const status = membershipStatusFromExpiration(expiration);
    const remaining = calculateRemainingDays(expiration);
    if (status === "Expired" || remaining <= 0) {
      expired_members += 1;
    } else {
      // Active + ExpiringSoon still count as active memberships
      active_members += 1;
      activePlanIds.add(latest.planId);
    }
  }

  return {
    today_sales: toMoneyString(salesAgg._sum.amount?.toString() ?? "0"),
    today_transaction_count: salesAgg._count._all,
    active_members,
    expired_members,
    active_membership_plans: activePlanIds.size,
  };
}
