import prisma from "@/app/lib/prisma";
import ProductsPageClient from "./ProductsPageClient";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { barcode: "asc" },
  });

  return <ProductsPageClient initialProducts={products} />;
}
