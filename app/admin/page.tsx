import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { Network, Package, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

async function getDashboardStats() {
  const [groupCount, productCount, countTotal] = await Promise.all([
    prisma.group.count(),
    prisma.product.count(),
    prisma.inventoryCount.count(),
  ]);

  return { groupCount, productCount, countTotal };
}

export default async function AdminDashboard() {
  const { groupCount, productCount, countTotal } = await getDashboardStats();

  const statCards = [
    { label: "Total Groups", value: groupCount, icon: Network, href: "/admin/groups", color: "bg-purple-50 text-purple-600" },
    { label: "Total Products", value: productCount, icon: Package, href: "/admin/products", color: "bg-blue-50 text-blue-600" },
    { label: "Total Scans", value: countTotal, icon: Activity, href: "/admin/monitor", color: "bg-green-50 text-green-600" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your inventory system</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{label}</p>
              <p className="text-3xl font-extrabold text-slate-900">{value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
