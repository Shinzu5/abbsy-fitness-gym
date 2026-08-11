import { prisma } from "./prisma";

async function initDatabase() {
  // Prefer Prisma migrations: `npx prisma migrate deploy`
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log(
    "Prisma database connection OK. Run `npx prisma migrate deploy` to apply schema migrations."
  );
  await prisma.$disconnect();
}

initDatabase().catch(async (err) => {
  console.error("Failed to initialize database:", err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
