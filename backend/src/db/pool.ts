import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl === "PUT_NEON_CONNECTION_STRING_HERE") {
  console.warn(
    "[db] DATABASE_URL is not configured. Set it in backend/.env before using the API."
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err);
});
