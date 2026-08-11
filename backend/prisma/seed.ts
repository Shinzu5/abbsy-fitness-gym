import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const username = "brenie";
  const passwordHash = await bcrypt.hash("brenie", 10);

  await prisma.user.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
    },
    update: {
      // Keep existing password hash unless re-seeding intentionally updates it
      passwordHash,
    },
  });

  console.log(`Seeded login user: ${username}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
