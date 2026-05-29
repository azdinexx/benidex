import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { ClipboardList } from "lucide-react";
import CountsTableClient from "./CountsTableClient";

export default async function UserCountsPage() {
  const session = await getServerSession(authOptions);
  const groupId = (session?.user as any)?.id;

  const counts = await prisma.inventoryCount.findMany({
    where: { groupId },
    include: { product: true },
    orderBy: { timestamp: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
          <ClipboardList size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Counts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All your scanned items
          </p>
        </div>
      </div>

      <CountsTableClient initialCounts={counts} />
    </div>
  );
}
