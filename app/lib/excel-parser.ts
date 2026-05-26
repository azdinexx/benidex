import * as XLSX from 'xlsx';
import prisma from './prisma';

export async function importProductsFromBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  // Filter and map data
  const validProducts = [];
  const seenRefs = new Set();

  for (const row of data as any[]) {
    // Find keys case-insensitively just in case
    const getVal = (keyStr: string) => {
      const foundKey = Object.keys(row).find(k => k.toLowerCase() === keyStr.toLowerCase());
      return foundKey ? row[foundKey] : undefined;
    };

    const ref = String(getVal('ref') || '').trim();
    if (!ref || seenRefs.has(ref)) continue;
    
    seenRefs.add(ref);

    const name = String(getVal('name') || 'Unknown Product');
    const category = getVal('category') ? String(getVal('category')) : null;
    const priceVal = getVal('price');
    const price = priceVal !== undefined && !isNaN(Number(priceVal)) ? Number(priceVal) : null;

    validProducts.push({
      barcode: ref,
      name,
      category,
      price,
    });
  }

  // Use a transaction for atomic bulk import
  return await prisma.$transaction(
    validProducts.map((p) =>
      prisma.product.upsert({
        where: { barcode: p.barcode },
        update: {
          name: p.name,
          category: p.category,
          price: p.price,
        },
        create: {
          barcode: p.barcode,
          name: p.name,
          category: p.category,
          price: p.price,
        }
      })
    )
  );
}