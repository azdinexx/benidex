import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { ClipboardList, Package } from "lucide-react";

export default async function UserCountsPage() {
  const session = await getServerSession(authOptions);
  const groupId = (session?.user as any)?.id;

  const counts = await prisma.inventoryCount.findMany({
    where: { groupId },
    include: { product: true },
    orderBy: { timestamp: "desc" },
  });

  const totalScanned = counts.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueProducts = new Set(counts.map((c) => c.productId)).size;

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

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-slate-500 text-sm font-medium">Total Scanned</p>
          <p className="text-4xl font-extrabold text-blue-600 mt-1">{totalScanned}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-slate-500 text-sm font-medium">Unique Products</p>
          <p className="text-4xl font-extrabold text-slate-900 mt-1">{uniqueProducts}</p>
        </div>
      </div>

      {/* Count Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Scan History</h2>
        </div>
        {counts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 italic">You haven't scanned anything yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  {["Time", "Product", "Ref / Barcode", "Qty"].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {counts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(c.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">{c.product.name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{c.product.barcode}</td>
                    <td className="px-6 py-3">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg text-sm">+{c.quantity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
