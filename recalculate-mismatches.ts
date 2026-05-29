import prisma from './app/lib/prisma';
import { MismatchType } from './prisma/generated/client';

async function main() {
  const products = await prisma.product.findMany({
    include: { counts: true },
  });

  console.log(`Found ${products.length} products with counts`);

  for (const product of products) {
    if (product.counts.length === 0) continue;

    console.log(`\n--- Product: ${product.barcode} (adminCorrected: ${product.adminCorrected}, qty: ${product.qty}) ---`);
    
    const sortedCounts = [...product.counts].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    for (const count of sortedCounts) {
      console.log(`  Count: groupId=${count.groupId}, loc=${count.location}, qty=${count.quantity}, isMismatch=${count.isMismatch}, type=${count.mismatchType}`);
    }

    if (product.adminCorrected) {
      console.log(`  -> Skipping (adminCorrected)`);
      continue;
    }

    const locationReference = new Map<string, { quantity: number; groupId: string; countId: string }>();
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
      let mismatchType: MismatchType = MismatchType.UNKNOWN;

      const ref = locationReference.get(count.location);

      if (ref && count.id === ref.countId) {
        isMismatch = false;
        mismatchType = MismatchType.UNKNOWN;
      } else if (ref && count.quantity !== ref.quantity) {
        isMismatch = true;
        mismatchType = MismatchType.QUANTITY_MISMATCH;
      }

      if (count.isMismatch !== isMismatch || count.mismatchType !== mismatchType) {
        console.log(`  -> FIXING count ${count.id}: isMismatch=${count.isMismatch}->${isMismatch}, type=${count.mismatchType}->${mismatchType}`);
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
