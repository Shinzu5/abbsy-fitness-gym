import { Pool } from "pg";
import dotenv from "dotenv";
import { normalizeDatabaseUrl } from "./databaseUrl";

dotenv.config();

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl || rawDatabaseUrl === "PUT_NEON_CONNECTION_STRING_HERE") {
  console.warn(
    "[db] DATABASE_URL is not configured. Set it in backend/.env before using the API."
  );
}

const databaseUrl = rawDatabaseUrl
  ? normalizeDatabaseUrl(rawDatabaseUrl)
  : undefined;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err);
});
