/** Business day in Asia/Manila (UTC+8) as YYYY-MM-DD */
export function getBusinessDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Inclusive UTC range covering one Manila business calendar day. */
export function getManilaDayRange(businessDate = getBusinessDate()): {
  start: Date;
  end: Date;
} {
  return {
    start: new Date(`${businessDate}T00:00:00+08:00`),
    end: new Date(`${businessDate}T23:59:59.999+08:00`),
  };
}

/**
 * Format a Prisma/Postgres DATE (UTC midnight) as YYYY-MM-DD without local TZ shift.
 */
export function formatDateOnly(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToDate(startDate: string, days: number): string {
  const date = new Date(`${startDate.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

/**
 * Add calendar months (same day-of-month when possible).
 * Example: 2026-07-13 + 1 month = 2026-08-13
 */
export function addMonthsToDate(startDate: string, months: number): string {
  const [year, month, day] = startDate.slice(0, 10).split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0)
  ).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return formatDateOnly(
    new Date(Date.UTC(targetYear, normalizedMonth, clampedDay))
  );
}

/**
 * ONE source of truth for membership expiration date (DATE only).
 *
 * Monthly / 30-day plans use calendar month so:
 *   Jul 13 + Monthly/30 → Aug 13
 * Other durations use day count:
 *   Jul 13 + 15 → Jul 28
 */
export function calculateExpirationDate(
  startDate: string,
  durationDays: number
): string {
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new Error("durationDays must be a positive integer");
  }
  const start = startDate.slice(0, 10);
  // Monthly is stored as duration_days=30; keep a full month (not start+30=Aug 12)
  if (durationDays === 30) {
    return addMonthsToDate(start, 1);
  }
  return addDaysToDate(start, durationDays);
}

const GYM_TZ = "+08:00";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Expiration instant for a DATE-only expiration_date (Asia/Manila).
 * remainingTime = expirationDateTime - currentDateTime
 *
 * Examples (expiration Aug 25):
 * - Aug 10 → ~15 days
 * - Aug 20 → ~5 days
 * - Aug 24 → ~1 day
 * - Aug 25 00:00 → expired
 */
export function getExpirationDateTime(expirationDate: string): Date {
  const day = expirationDate.slice(0, 10);
  return new Date(`${day}T00:00:00.000${GYM_TZ}`);
}

/** Remaining ms until expiration datetime (0 if already expired). */
export function calculateRemainingMs(
  expirationDate: string,
  now: Date = new Date()
): number {
  const end = getExpirationDateTime(expirationDate);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, end.getTime() - now.getTime());
}

export type RemainingBreakdown = {
  total_ms: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

/** Full remaining breakdown from expirationDateTime - now (never from registration date). */
export function calculateRemainingBreakdown(
  expirationDate: string,
  now: Date = new Date()
): RemainingBreakdown {
  const total_ms = calculateRemainingMs(expirationDate, now);
  const totalSeconds = Math.floor(total_ms / 1000);
  return {
    total_ms,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: total_ms <= 0,
  };
}

/**
 * Remaining whole days from expirationDateTime - now.
 * Derived only from the real expiration timestamp.
 */
export function calculateRemainingDays(
  expirationDate: string,
  now: Date = new Date()
): number {
  return calculateRemainingBreakdown(expirationDate, now).days;
}

export type MembershipLiveStatus =
  | "Active"
  | "ExpiringSoon"
  | "Expired"
  | "None";

/**
 * Same remainingTime source as Days Remaining:
 * > 5 days → ACTIVE
 * > 0 && <= 5 days → EXPIRING SOON
 * <= 0 → EXPIRED
 */
export function membershipStatusFromRemainingMs(
  remainingMs: number
): Exclude<MembershipLiveStatus, "None"> {
  if (remainingMs > 5 * MS_PER_DAY) return "Active";
  if (remainingMs > 0) return "ExpiringSoon";
  return "Expired";
}

export function membershipStatusFromRemaining(
  remainingDays: number
): Exclude<MembershipLiveStatus, "None"> {
  if (remainingDays > 5) return "Active";
  if (remainingDays > 0) return "ExpiringSoon";
  return "Expired";
}

export function membershipStatusFromExpiration(
  expirationDate: string | null | undefined,
  now: Date = new Date()
): MembershipLiveStatus {
  if (!expirationDate) return "None";
  const remainingMs = calculateRemainingMs(expirationDate, now);
  return membershipStatusFromRemainingMs(remainingMs);
}

export function formatClosingParts(closedAt: Date | string) {
  const date = typeof closedAt === "string" ? new Date(closedAt) : closedAt;
  const closing_date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const closing_time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return { closing_date, closing_time };
}

/** Store DATE-only values as UTC midnight (no local timezone shift). */
export function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
