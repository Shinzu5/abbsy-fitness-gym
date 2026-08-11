import { Request, Response } from "express";
import * as authService from "../services/authService";
import {
  COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "../utils/session";

export async function login(req: Request, res: Response) {
  const username = String(req.body?.username ?? "");
  const password = String(req.body?.password ?? "");
  const user = await authService.authenticateUser(username, password);
  const token = createSessionToken(user.id, user.username);
  const session = verifySessionToken(token);
  res.cookie(COOKIE_NAME, token, sessionCookieOptions());
  res.json({
    id: user.id,
    username: user.username,
    token,
    expiresAt: session?.exp ?? Date.now() + 60 * 60 * 1000,
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== "string") {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const session = verifySessionToken(token);
  if (!session) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const user = await authService.getUserById(session.userId);
  if (!user) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    expiresAt: session.exp,
  });
}
