import { PrismaClient } from './prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  // First, check all products for adminCorrected flag
  const products = await prisma.product.findMany({
    include: { counts: true },
  });

  console.log(`Found ${products.length} products total`);

  for (const product of products) {
    if (product.counts.length === 0) continue;

    console.log(`\n--- Product: ${product.barcode} (adminCorrected: ${product.adminCorrected}) ---`);
    
    for (const count of product.counts) {
      console.log(`  Count: group=${count.groupId}, loc=${count.location}, qty=${count.quantity}, isMismatch=${count.isMismatch}, type=${count.mismatchType}`);
    }

    // Recalculate
    if (product.adminCorrected) {
      console.log(`  -> Skipping (adminCorrected)`);
      continue;
    }

    const sortedCounts = [...product.counts].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const locationReference = new Map();
    for (const count of sortedCounts) {
      if (!locationReference.has(count.location)) {
        locationReference.set(count.location, {
          quantity: count.quantity,
          groupId: count.groupId,
          countId: count.id,
        });
      }
    }

    for (const count of product.counts) {
      let isMismatch = false;
      let mismatchType = 'UNKNOWN';

      const ref = locationReference.get(count.location);

      if (ref && count.id === ref.countId) {
        isMismatch = false;
        mismatchType = 'UNKNOWN';
      } else if (ref && count.quantity !== ref.quantity) {
        isMismatch = true;
        mismatchType = 'QUANTITY_MISMATCH';
      }

      if (count.isMismatch !== isMismatch || count.mismatchType !== mismatchType) {
        console.log(`  -> Updating count ${count.id}: isMismatch=${isMismatch}, type=${mismatchType}`);
        await prisma.inventoryCount.update({
          where: { id: count.id },
          data: { isMismatch, mismatchType },
        });
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
