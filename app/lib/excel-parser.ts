import * as XLSX from "xlsx";
import prisma from "./prisma";

const BATCH_SIZE = 50;

export async function importProductsFromBuffer(buffer: Buffer) {
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const validProducts = [];
  const seenRefs = new Set();

  for (const row of data as any[]) {
    const getVal = (keyStr: string) => {
      const foundKey = Object.keys(row).find(
        (k) => k.toLowerCase() === keyStr.toLowerCase(),
      );
      return foundKey ? row[foundKey] : undefined;
    };

    const ref = String(getVal("ref") || "").trim();
    if (!ref || seenRefs.has(ref)) continue;
    seenRefs.add(ref);

    const category = getVal("category") ? String(getVal("category")) : null;
    const priceVal = getVal("price");
    const price =
      priceVal !== undefined && !isNaN(Number(priceVal))
        ? Number(priceVal)
        : null;

    validProducts.push({ barcode: ref, category, price });
  }

  const results = [];
  for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
    const batch = validProducts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((p) =>
        prisma.product.upsert({
          where: { barcode: p.barcode },
          update: { category: p.category, price: p.price },
          create: { barcode: p.barcode, category: p.category, price: p.price },
        }),
      ),
    );
    results.push(...batchResults);
  }

  return results;
}
