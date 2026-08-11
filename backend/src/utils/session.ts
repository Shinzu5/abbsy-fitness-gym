import crypto from "crypto";

const COOKIE_NAME = "abbsy_session";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export { COOKIE_NAME };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set it in backend/.env"
    );
  }
  return secret;
}

export type SessionPayload = {
  userId: number;
  username: string;
  exp: number;
};

export function createSessionToken(
  userId: number,
  username: string,
  ttlMs = DEFAULT_TTL_MS
): string {
  const payload: SessionPayload = {
    userId,
    username,
    exp: Date.now() + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(body)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload?.userId || !payload?.username || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: DEFAULT_TTL_MS,
    path: "/",
  };
}
