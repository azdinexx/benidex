import "dotenv/config";
import { PrismaClient } from "../prisma/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const admins = [
  { name: "Badr", email: "badr@benidex.com", password: "badr1234" },
  { name: "Sanae", email: "sanae@benidex.com", password: "sanae1234" },
  { name: "Zakaria", email: "zakaria@benidex.com", password: "zakaria1234" },
] as const;

const groups = [
  { name: "Group-1", password: "group11234" },
  { name: "Group-2", password: "group21234" },
  { name: "Group-3", password: "group31234" },
] as const;

async function main() {
  console.log("🌱 Seeding admins...\n");

  for (const a of admins) {
    const hashed = await bcrypt.hash(a.password, 12);

    const admin = await prisma.admin.upsert({
      where: { email: a.email },
      update: { name: a.name, password: hashed },
      create: { name: a.name, email: a.email, password: hashed },
    });

    console.log(`  ✅  ADMIN  ${admin.name.padEnd(10)}  ${admin.email}`);
  }

  console.log("\n🌱 Seeding groups...\n");

  for (const g of groups) {
    const hashed = await bcrypt.hash(g.password, 12);

    const group = await prisma.group.upsert({
      where: { name: g.name },
      update: { name: g.name, password: hashed },
      create: { name: g.name, password: hashed },
    });

    console.log(
      `  ✅  GROUP  ${group.name.padEnd(10)}  (password: ${g.password})`,
    );
  }

  console.log("\n✨ Done! Default passwords seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
