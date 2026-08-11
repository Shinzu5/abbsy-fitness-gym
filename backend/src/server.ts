import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { prisma } from "./db/prisma";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const frontendOrigins = (
  process.env.FRONTEND_ORIGIN || "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin) and configured frontend origins
      if (!origin || frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ABBSY FITNESS GYM API" });
});

app.use("/api", routes);
app.use(errorHandler);

async function start() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl === "PUT_NEON_CONNECTION_STRING_HERE") {
    console.error(
      "DATABASE_URL is missing. Set your Neon connection string in backend/.env"
    );
    process.exit(1);
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    console.error(
      "SESSION_SECRET is missing or too short. Set a long secret in backend/.env"
    );
    process.exit(1);
  }

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("Connected to Neon PostgreSQL via Prisma.");
  } catch (err) {
    console.error("Failed to connect to database via Prisma:", err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`ABBSY FITNESS GYM API running on http://localhost:${PORT}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other backend process, then run npm run dev again.`
      );
      process.exit(1);
    }
    throw err;
  });
}

start();
