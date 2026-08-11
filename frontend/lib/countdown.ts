/** Gym timezone used for membership expiration instants. */
export const GYM_TIMEZONE_OFFSET = "+08:00";

export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export type LiveMembershipStatus = "Active" | "ExpiringSoon" | "Expired" | "None";

/**
 * Expiration instant for a DATE-only expiration_date.
 * Matches backend remaining-days logic: expired at start of the expiration calendar day (Asia/Manila).
 */
export function getExpirationInstant(
  expirationDate: string | null | undefined
): Date | null {
  if (!expirationDate) return null;
  const day = String(expirationDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return new Date(`${day}T00:00:00.000${GYM_TIMEZONE_OFFSET}`);
}

export function getCountdownParts(
  expirationDate: string | null | undefined,
  now: Date = new Date()
): CountdownParts {
  const instant = getExpirationInstant(expirationDate);
  if (!instant || Number.isNaN(instant.getTime())) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }

  const totalMs = Math.max(0, instant.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    expired: totalMs <= 0,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatCountdown(parts: CountdownParts): string {
  return `${parts.days} days ${pad2(parts.hours)} hours ${pad2(parts.minutes)} minutes ${pad2(parts.seconds)} seconds`;
}

export function getLiveMembershipStatus(
  expirationDate: string | null | undefined,
  now: Date = new Date()
): LiveMembershipStatus {
  if (!expirationDate) return "None";
  const parts = getCountdownParts(expirationDate, now);
  if (parts.expired) return "Expired";
  if (parts.days <= 5) return "ExpiringSoon";
  return "Active";
}
