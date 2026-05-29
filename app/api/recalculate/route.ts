import { NextResponse } from 'next/server';
import { recalculateMismatchesForProduct } from '@/app/actions';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        counts: { some: {} },
      },
      select: { id: true, barcode: true },
    });

    let fixed = 0;
    for (const product of products) {
      await recalculateMismatchesForProduct(product.id);
      fixed++;
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated mismatches for ${fixed} products`,
    });
  } catch (error) {
    console.error('Recalculation error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
