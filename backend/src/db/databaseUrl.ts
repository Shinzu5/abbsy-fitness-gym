/**
 * Neon URLs sometimes include libpq-only flags (channel_binding, uselibpqcompat)
 * that break node-postgres on cloud hosts like Render.
 */
export function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    url.searchParams.delete("uselibpqcompat");
    if (!url.searchParams.get("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString().replace(/^https?:/, "postgresql:");
  } catch {
    return raw
      .replace(/([?&])channel_binding=[^&]*/g, "$1")
      .replace(/([?&])uselibpqcompat=[^&]*/g, "$1")
      .replace(/\?&/, "?")
      .replace(/&&/g, "&")
      .replace(/[?&]$/, "");
  }
}

export function getDatabaseHost(raw: string | undefined): string {
  if (!raw) return "(missing)";
  try {
    return new URL(raw.replace(/^postgresql:/, "http:")).host;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}
