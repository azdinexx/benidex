import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { ScanLine, MapPin, ArrowRight, Package } from "lucide-react";
import Link from "next/link";

export default async function UserHome() {
  const session = await getServerSession(authOptions);
  const groupId = (session?.user as any)?.id;

  // Fetch group
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });

  // Get this group's count
  const groupCountTotal = await prisma.inventoryCount.count({
    where: { groupId },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Hello, {session?.user?.name || "Group"} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's your inventory assignment for today</p>
      </div>

      {/* Session Status */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <p className="font-bold text-green-800 text-lg">System Active</p>
        </div>
        <p className="text-green-600 text-sm ml-5">You can scan items now</p>
      </div>

      {/* Group Info */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <MapPin className="text-blue-600" size={20} /> Your Info
        </h2>
        {group ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-slate-100">
              <span className="text-slate-500 text-sm">Group</span>
              <span className="font-semibold text-slate-800">{group.name}</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 italic text-sm">You have not been assigned to a group yet. Please contact your admin.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-slate-500 text-sm font-medium">Total Scans</p>
          <p className="text-4xl font-extrabold text-blue-600 mt-1">{groupCountTotal}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-center">
          <p className="text-slate-500 text-sm font-medium">Your Group</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 truncate">{group?.name || "—"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-4">
        <Link
          href="/user/scan"
          className="group flex items-center justify-between p-6 rounded-2xl border shadow-sm transition-all bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-blue-500/20"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <ScanLine size={24} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">Start Scanning</p>
              <p className="text-sm text-blue-100">
                Tap to open the scanner
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/user/counts"
          className="group flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
              <Package size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">My Scan History</p>
              <p className="text-sm text-slate-500">View items you've counted</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
