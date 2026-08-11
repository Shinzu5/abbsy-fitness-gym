/** Normalize and validate a positive monetary amount as a decimal string. */
export function parsePositiveAmount(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;

  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;

  return num.toFixed(2);
}

export function toMoneyString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}
