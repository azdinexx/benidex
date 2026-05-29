import { PrismaClient } from './prisma/generated/index.js';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.product.updateMany({ data: { qty: null } });
  console.log(`Reset ${result.count} products to null qty.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
