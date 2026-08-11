import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import {
  COOKIE_NAME,
  SessionPayload,
  verifySessionToken,
} from "../utils/session";

export type AuthedRequest = Request & {
  auth?: SessionPayload;
};

export function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== "string") {
    return next(new AppError("Authentication required", 401));
  }

  const session = verifySessionToken(token);
  if (!session) {
    return next(new AppError("Authentication required", 401));
  }

  req.auth = session;
  return next();
}
