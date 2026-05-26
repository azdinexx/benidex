import { PrismaClient } from './prisma/generated/index.js';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.product.updateMany({ data: { expectedQty: null } });
  console.log(`Reset ${result.count} products to null expectedQty.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
