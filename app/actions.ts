"use server";
import { ActionResponse } from "@/app/types/actions";
import { InventoryCount, Product, Group } from "@/prisma/generated/client";
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
    });
    if (!product)
      return { success: false, error: "Product not found in database." };

    // Baseline handling — first group to scan this product sets the expected qty
    if (product.expectedQty === null) {
      await prisma.product.update({
        where: { id: product.id },
        data: { expectedQty: quantity, baselineGroupId: group.id },
      });
    }

    // Create the count entry
    const newCount = await prisma.inventoryCount.create({
      data: {
        productId: product.id,
        groupId: group.id,
        quantity,
        isMismatch: false, // temporary, updated below
        location,
      },
      include: { product: true },
    });

    // Determine mismatch against baseline
    let isMismatch = false;
    if (product.expectedQty !== null) {
      const total = await prisma.inventoryCount.aggregate({
        where: { productId: product.id },
        _sum: { quantity: true },
      });
      const totalQty = total._sum?.quantity || 0;
      isMismatch = totalQty !== product.expectedQty;
    }

    // Update count with final mismatch flag
    const updatedCount = await prisma.inventoryCount.update({
      where: { id: newCount.id },
      data: { isMismatch },
      include: { product: true },
    });

    return {
      success: true,
      data: updatedCount,
    };
  } catch (e) {
    console.error("Failed to save count:", e);
    return { success: false, error: "Failed to save count." };
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
      timestamp: Date;
      userName: string;
      productName: string;
      quantity: number;
      isMismatch: boolean;
    }>;
    stats: {
      totalCounted: number;
      mismatches: number;
      activeUsersCount: number;
    };
    productCounts: Record<string, { expectedQty: number; scannedQty: number }>;
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
      timestamp: count.timestamp,
      userName: count.group.name,
      productName: count.product.barcode,
      quantity: count.quantity,
      isMismatch: count.isMismatch,
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
