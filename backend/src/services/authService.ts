import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { AppError } from "../middleware/errorHandler";

const SALT_ROUNDS = 10;

export async function authenticateUser(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) {
    throw new AppError("Invalid username or password", 401);
  }

  const user = await prisma.user.findUnique({
    where: { username: normalized },
  });

  if (!user) {
    throw new AppError("Invalid username or password", 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError("Invalid username or password", 401);
  }

  return {
    id: user.id,
    username: user.username,
  };
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true },
  });
  return user;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
