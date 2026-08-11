import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString || connectionString === "PUT_NEON_CONNECTION_STRING_HERE") {
  console.warn(
    "[db] DATABASE_URL is not configured. Set it in backend/.env before using the API."
  );
}

const adapter = new PrismaPg({
  connectionString: connectionString || undefined,
});

export const prisma = new PrismaClient({
  adapter,
});
