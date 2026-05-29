"use server";
import { ActionResponse } from "@/app/types/actions";
import {
  InventoryCount,
  Product,
  Group,
  MismatchType,
} from "@/prisma/generated/client";
import prisma from "./lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./lib/auth";
import bcrypt from "bcrypt";
import { importProductsFromBuffer } from "./lib/excel-parser";
import { revalidatePath } from "next/cache";

// ─── Auth Helpers ────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/** Returns the Group record for the currently authenticated group session. */
async function getAuthenticatedGroup(): Promise<Group | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "GROUP") return null;
  return prisma.group.findUnique({ where: { id: session.user.id } });
}

// ─── Scan Action ─────────────────────────────────────────────────────────────

export async function recalculateMismatchesForProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { counts: true },
  });

  if (!product) return;

  // 1. If product has no baseline qty yet but counts exist:
  if (product.qty === null && product.counts.length > 0) {
    // Find the earliest count to set as the baseline
    const sorted = [...product.counts].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const earliest = sorted[0];
    await prisma.product.update({
      where: { id: productId },
      data: {
        qty: earliest.quantity,
        baselineGroupId: earliest.groupId,
        adminCorrected: false,
      },
    });
    product.qty = earliest.quantity;
    product.baselineGroupId = earliest.groupId;
  }

  // 2. Determine mismatch statuses for all counts
  if (product.qty !== null) {
    if (product.adminCorrected) {
      // If admin has corrected the count, all current counts are marked as correct (discrepancy resolved)
      for (const count of product.counts) {
        if (count.isMismatch || count.mismatchType !== MismatchType.UNKNOWN) {
          await prisma.inventoryCount.update({
            where: { id: count.id },
            data: {
              isMismatch: false,
              mismatchType: MismatchType.UNKNOWN,
            },
          });
        }
      }
    } else {
      // Find the baseline count (the earliest count by the baseline group)
      const baselineCounts = product.counts.filter(c => c.groupId === product.baselineGroupId);
      const baselineCount = baselineCounts.length > 0
        ? [...baselineCounts].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]
        : null;

      const baselineLocation = baselineCount ? baselineCount.location : null;

      for (const count of product.counts) {
        let isMismatch = false;
        let mismatchType: MismatchType = MismatchType.UNKNOWN;

        if (baselineCount && count.id === baselineCount.id) {
          // The baseline count itself is never a mismatch
          isMismatch = false;
          mismatchType = MismatchType.UNKNOWN;
        } else {
          if (count.quantity !== product.qty) {
            isMismatch = true;
            mismatchType = MismatchType.QUANTITY_MISMATCH;
          } else if (baselineLocation && count.location !== baselineLocation) {
            isMismatch = true;
            mismatchType = MismatchType.LOCATION_MISMATCH;
          }
        }

        if (count.isMismatch !== isMismatch || count.mismatchType !== mismatchType) {
          await prisma.inventoryCount.update({
            where: { id: count.id },
            data: { isMismatch, mismatchType },
          });
        }
      }
    }
  }
}

export async function submitCountAction(
  formData: FormData,
): Promise<
  ActionResponse<
    InventoryCount & { product: Product } & { isMismatch: boolean }
  >
> {
  const rawQty = formData.get("quantity");
  const rawBarcode = formData.get("barcode");
  const location = formData.get("location") as string;

  if (
    !rawQty ||
    !rawBarcode ||
    typeof rawQty !== "string" ||
    typeof rawBarcode !== "string" ||
    typeof location !== "string" ||
    !location.match(/^[A-Z]-\d+-\d+$/)
  ) {
    return { success: false, error: "Invalid data submitted." };
  }

  const quantity = parseInt(rawQty, 10);
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "Please enter a valid quantity." };
  }

  try {
    // Must be an authenticated Group — not an Admin
    const group = await getAuthenticatedGroup();
    if (!group)
      return { success: false, error: "Unauthorized: Please log in." };

    const product = await prisma.product.findUnique({
      where: { barcode: rawBarcode },
      include: { counts: true },
    });

    if (!product)
      return { success: false, error: "Product not found in database." };

    // Create the count entry
    const newCount = await prisma.inventoryCount.create({
      data: {
        productId: product.id,
        groupId: group.id,
        quantity,
        isMismatch: false,
        mismatchType: MismatchType.UNKNOWN,
        location,
      },
      include: { product: true },
    });

    // If first time counting this product, set baseline
    if (product.qty === null) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          qty: quantity,
          baselineGroupId: group.id,
          adminCorrected: false,
        },
      });
    }

    // Recalculate mismatches for all counts of this product
    await recalculateMismatchesForProduct(product.id);

    // Retrieve the updated count
    const updatedCount = await prisma.inventoryCount.findUnique({
      where: { id: newCount.id },
      include: { product: true },
    });

    if (!updatedCount) {
      return { success: false, error: "Failed to retrieve saved count." };
    }

    return {
      success: true,
      data: updatedCount,
    };
  } catch (e) {
    console.error("Failed to save count:", e);
    return { success: false, error: "Failed to save count." };
  }
}

export async function editCountAction(
  formData: FormData,
): Promise<ActionResponse<InventoryCount>> {
  const id = formData.get("id") as string;
  const rawQty = formData.get("quantity");
  const location = formData.get("location") as string;

  if (
    !id ||
    !rawQty ||
    typeof id !== "string" ||
    typeof rawQty !== "string" ||
    typeof location !== "string" ||
    !location.match(/^[A-Z]-\d+-\d+$/)
  ) {
    return { success: false, error: "Invalid data submitted." };
  }

  const quantity = parseInt(rawQty, 10);
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "Please enter a valid quantity." };
  }

  try {
    const group = await getAuthenticatedGroup();
    if (!group) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    // Retrieve the count and check ownership
    const count = await prisma.inventoryCount.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!count) {
      return { success: false, error: "Count not found." };
    }

    if (count.groupId !== group.id) {
      return { success: false, error: "Unauthorized: You do not own this count." };
    }

    // Update the count
    await prisma.inventoryCount.update({
      where: { id },
      data: {
        quantity,
        location,
      },
    });

    // If this count is the baseline count, we need to update the baseline qty in Product
    const product = count.product;
    if (product.baselineGroupId === group.id) {
      // Find the earliest count by baseline group for this product
      const baselineCounts = await prisma.inventoryCount.findMany({
        where: { productId: product.id, groupId: group.id },
        orderBy: { timestamp: "asc" },
      });
      const baselineCount = baselineCounts[0];
      // If the edited count is the baseline count, update the Product baseline qty
      if (baselineCount && baselineCount.id === id) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            qty: quantity,
          },
        });
      }
    }

    // Recalculate mismatches for the product
    await recalculateMismatchesForProduct(product.id);

    // Fetch final count with updated fields
    const finalCount = await prisma.inventoryCount.findUnique({
      where: { id },
      include: { product: true },
    });

    revalidatePath("/user/counts");
    return { success: true, data: finalCount! };
  } catch (e) {
    console.error("Failed to edit count:", e);
    return { success: false, error: "Failed to edit count." };
  }
}

export async function correctMismatchAction(
  formData: FormData,
): Promise<ActionResponse<Product>> {
  const productId = formData.get("productId") as string;
  const rawQty = formData.get("correctQuantity");

  if (!productId || typeof productId !== "string" || !rawQty || typeof rawQty !== "string") {
    return { success: false, error: "Invalid data submitted." };
  }

  const correctQuantity = parseInt(rawQty, 10);
  if (isNaN(correctQuantity) || correctQuantity < 0) {
    return { success: false, error: "Please enter a valid quantity." };
  }

  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || authUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admins only." };
    }

    // Update the product baseline
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        qty: correctQuantity,
        adminCorrected: true,
        baselineGroupId: null, // Clear baseline group since it's now admin-corrected
      },
    });

    // Clear mismatch status for all counts of this product
    await prisma.inventoryCount.updateMany({
      where: { productId },
      data: {
        isMismatch: false,
        mismatchType: MismatchType.UNKNOWN,
      },
    });

    revalidatePath("/admin/monitor");
    revalidatePath("/admin/products");
    return { success: true, data: updatedProduct };
  } catch (e) {
    console.error("Failed to correct mismatch:", e);
    return { success: false, error: "Failed to correct mismatch." };
  }
}

export async function getProductCountsAction(
  productId: string,
): Promise<
  ActionResponse<
    Array<{
      id: string;
      groupName: string;
      quantity: number;
      location: string;
      timestamp: Date;
    }>
  >
> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || authUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admins only." };
    }

    const counts = await prisma.inventoryCount.findMany({
      where: { productId },
      include: {
        group: { select: { name: true } },
      },
      orderBy: { timestamp: "asc" },
    });

    const data = counts.map(c => ({
      id: c.id,
      groupName: c.group.name,
      quantity: c.quantity,
      location: c.location,
      timestamp: c.timestamp,
    }));

    return { success: true, data };
  } catch (e) {
    console.error("Failed to fetch product counts:", e);
    return { success: false, error: "Failed to fetch product counts." };
  }
}

// ─── Group Actions ─────────────────────────────────────────────────────────────

export async function createGroupAction(
  formData: FormData,
): Promise<ActionResponse<Group>> {
  const name = formData.get("name");
  const password = formData.get("password");
  if (!name || typeof name !== "string" || !name.trim()) {
    return { success: false, error: "Group name is required." };
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    return { success: false, error: "Group password is required." };
  }

  try {
    const existing = await prisma.group.findUnique({
      where: { name: name.trim() },
    });
    if (existing)
      return { success: false, error: "Group name already exists." };

    const hashedPassword = await bcrypt.hash(password, 12);
    const group = await prisma.group.create({
      data: { name: name.trim(), password: hashedPassword },
    });
    revalidatePath("/admin/groups");
    return { success: true, data: group };
  } catch (e) {
    console.error("Failed to create group:", e);
    return { success: false, error: "Failed to create group." };
  }
}

export async function renameGroupAction(
  formData: FormData,
): Promise<ActionResponse<Group>> {
  const id = formData.get("id");
  const name = formData.get("name");
  const password = formData.get("password");
  if (
    !id ||
    !name ||
    typeof id !== "string" ||
    typeof name !== "string" ||
    !name.trim()
  ) {
    return { success: false, error: "Group id and name are required." };
  }

  try {
    const conflict = await prisma.group.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (conflict)
      return {
        success: false,
        error: "A group with that name already exists.",
      };

    const data = { name: name.trim(), password: "" };
    if (password && typeof password === "string" && password.trim()) {
      data.password = await bcrypt.hash(password, 12);
    }

    const group = await prisma.group.update({ where: { id }, data });
    revalidatePath("/admin/groups");
    return { success: true, data: group };
  } catch (e) {
    console.error("Failed to rename group:", e);
    return { success: false, error: "Failed to rename group." };
  }
}

export async function getAllScansAction(): Promise<
  ActionResponse<{
    scans: Array<{
      id: string;
      productId: string;
      timestamp: Date;
      userName: string;
      productName: string;
      quantity: number;
      isMismatch: boolean;
      mismatchType: MismatchType;
      location: string;
    }>;
    stats: {
      totalCounted: number;
      mismatches: number;
      activeUsersCount: number;
    };
    productCounts: Record<string, { qty: number; scannedQty: number }>;
  }>
> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || authUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admins only." };
    }

    const counts = await prisma.inventoryCount.findMany({
      include: {
        product: true,
        group: { select: { name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    const scans = counts.map((count) => ({
      id: count.id,
      productId: count.productId,
      timestamp: count.timestamp,
      userName: count.group.name,
      productName: count.product.barcode,
      quantity: count.quantity,
      isMismatch: count.isMismatch,
      mismatchType: count.mismatchType,
      location: count.location,
    }));

    const mismatches = counts.filter((c) => c.isMismatch).length;
    const totalScannedQuantity = counts.reduce((s, c) => s + c.quantity, 0);
    const uniqueGroupIds = new Set(counts.map((c) => c.groupId));
    const activeUsersCount = uniqueGroupIds.size;

    return {
      success: true,
      data: {
        scans,
        stats: {
          totalCounted: totalScannedQuantity,
          mismatches,
          activeUsersCount,
        },
        productCounts: {},
      },
    };
  } catch (e) {
    console.error("Failed to fetch scans:", e);
    return { success: false, error: "Failed to load scans." };
  }
}

// ─── Product / Import Actions ─────────────────────────────────────────────────

export async function importProductsAction(
  formData: FormData,
): Promise<ActionResponse<{ count: number }>> {
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file uploaded." };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const results = await importProductsFromBuffer(buffer);
    revalidatePath("/admin/products");
    return { success: true, data: { count: results.length } };
  } catch (e) {
    console.error("Failed to import products:", e);
    return {
      success: false,
      error: "Failed to import products. Check your file format.",
    };
  }
}

export async function searchProductsAction(
  query: string,
): Promise<ActionResponse<Product[]>> {
  if (!query || typeof query !== "string" || !query.trim()) {
    return { success: true, data: [] };
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        barcode: { contains: query.trim(), mode: "insensitive" },
      },
      take: 8,
    });
    return { success: true, data: products };
  } catch (e) {
    console.error("Failed to search products:", e);
    return { success: false, error: "Failed to search products." };
  }
}

// ─── Accuracy Actions ───────────────────────────────────────────

export async function getGroupAccuracyStatsAction(): Promise<
  ActionResponse<
    Array<{
      groupId: string;
      groupName: string;
      totalScanned: number;
      errorsCount: number;
      accuracyRatio: string;
    }>
  >
> {
  try {
    const groups = await prisma.group.findMany({
      include: {
        counts: {
          include: { product: true },
        },
      },
    });

    const result = [];

    for (const group of groups) {
      const totalScanned = group.counts.reduce((sum, c) => sum + c.quantity, 0);
      const errorsCount = group.counts.filter((c) => c.isMismatch).length;

      let accuracyRatio = "100%";
      if (errorsCount > 0) {
        const ratio = (totalScanned / errorsCount).toFixed(1);
        accuracyRatio = `${ratio} (items/error)`;
      }

      result.push({
        groupId: group.id,
        groupName: group.name,
        totalScanned,
        errorsCount,
        accuracyRatio,
      });
    }

    return { success: true, data: result };
  } catch (e) {
    console.error("Failed to calculate accuracy stats:", e);
    return { success: false, error: "Failed to calculate accuracy stats." };
  }
}
