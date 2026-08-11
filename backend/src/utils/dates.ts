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

export function addDaysToDate(startDate: string, days: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Remaining calendar days until expiration (0 if expired or on expiration day). */
export function calculateRemainingDays(expirationDate: string): number {
  const today = getBusinessDate();
  const todayUtc = new Date(`${today}T00:00:00Z`).getTime();
  const expUtc = new Date(`${expirationDate}T00:00:00Z`).getTime();
  const diff = Math.ceil((expUtc - todayUtc) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
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

export function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
