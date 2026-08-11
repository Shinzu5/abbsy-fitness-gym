import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { normalizeDatabaseUrl } from "./databaseUrl";

dotenv.config();

const rawConnectionString = process.env.DATABASE_URL;

if (
  !rawConnectionString ||
  rawConnectionString === "PUT_NEON_CONNECTION_STRING_HERE"
) {
  console.warn(
    "[db] DATABASE_URL is not configured. Set it in backend/.env (or Render env vars)."
  );
}

const connectionString = rawConnectionString
  ? normalizeDatabaseUrl(rawConnectionString)
  : undefined;

const adapter = new PrismaPg({
  connectionString,
});

export const prisma = new PrismaClient({
  adapter,
});
