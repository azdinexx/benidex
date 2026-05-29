"use client";

import { useState, useTransition } from "react";
import { editCountAction } from "@/app/actions";
import { ClipboardList, Package, Edit, X, Minus, Plus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Count = {
  id: string;
  productId: string;
  product: {
    id: string;
    barcode: string;
  };
  quantity: number;
  location: string;
  timestamp: Date;
  isMismatch: boolean;
};

export default function CountsTableClient({ initialCounts }: { initialCounts: Count[] }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Count[]>(initialCounts);
  const [editingCount, setEditingCount] = useState<Count | null>(null);
  
  // Modal fields
  const [editQty, setEditQty] = useState<string>("1");
  const [editLetter, setEditLetter] = useState<string>("A");
  const [editColumn, setEditColumn] = useState<string>("1");
  const [editFloor, setEditFloor] = useState<string>("1");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if initialCounts changes
  if (initialCounts !== counts) {
    setCounts(initialCounts);
  }

  const openEditModal = (count: Count) => {
    setEditingCount(count);
    setEditQty(count.quantity.toString());
    
    // Parse location (format: E-1-1 or A-2-3)
    const locParts = count.location.split("-");
    if (locParts.length === 3) {
      setEditLetter(locParts[0]);
      setEditColumn(locParts[1]);
      setEditFloor(locParts[2]);
    } else {
      setEditLetter("A");
      setEditColumn("1");
      setEditFloor("1");
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const closeEditModal = () => {
    setEditingCount(null);
  };

  const adjustQty = (amount: number) => {
    setEditQty((prev) => {
      const current = parseInt(prev, 10);
      const next = isNaN(current) ? 1 : current + amount;
      return next > 0 ? next.toString() : "1";
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCount || isPending) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const q = parseInt(editQty, 10);
    if (isNaN(q) || q <= 0) {
      setErrorMsg("Please enter a valid quantity.");
      return;
    }

    const locationStr = `${editLetter}-${editColumn}-${editFloor}`;

    const formData = new FormData();
    formData.append("id", editingCount.id);
    formData.append("quantity", q.toString());
    formData.append("location", locationStr);

    startTransition(async () => {
      const res = await editCountAction(formData);
      if (res.success && res.data) {
        setSuccessMsg("Count updated successfully!");
        
        // Refresh server-side props so other components reflect the change
        router.refresh();
        
        // Auto-close modal after success message shows for a brief moment
        setTimeout(() => {
          closeEditModal();
        }, 1000);
      } else {
        setErrorMsg(res.error || "Failed to update count.");
      }
    });
  };

  const totalScanned = counts.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueProducts = new Set(counts.map((c) => c.productId)).size;

  return (
    <div className="space-y-8">
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
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
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
                  {["Time", "Location", "Ref / Barcode", "Qty", "Action"].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {counts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(c.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">{c.location}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{c.product.barcode}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg text-sm">+{c.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditModal(c)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-semibold text-xs rounded-lg transition-all border border-slate-150"
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Count Modal */}
      {editingCount && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 transform transition-all scale-100">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Scan Entry</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editingCount.product.barcode}</p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Location Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Location
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shadow-sm">
                  <select
                    value={editLetter}
                    onChange={(e) => setEditLetter(e.target.value)}
                    className="flex-1 text-center text-base font-bold bg-white border border-slate-200 rounded-xl py-1.5 outline-none focus:border-blue-500"
                    disabled={isPending}
                  >
                    {["A", "B", "C", "D"].map(l => <option key={l}>{l}</option>)}
                  </select>
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number" min="1" max="100"
                    value={editColumn}
                    onChange={(e) => setEditColumn(e.target.value)}
                    className="flex-1 text-center text-base font-bold bg-white border border-slate-200 rounded-xl py-1.5 outline-none focus:border-blue-500"
                    disabled={isPending}
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <select
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="flex-1 text-center text-base font-bold bg-white border border-slate-200 rounded-xl py-1.5 outline-none focus:border-blue-500"
                    disabled={isPending}
                  >
                    {[1, 2, 3, 4, 5].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Quantity
                </label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => adjustQty(-1)}
                    className="p-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition-colors font-bold border border-slate-200 shrink-0"
                    disabled={isPending}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="flex-1 text-center text-lg font-bold bg-transparent outline-none text-slate-800 min-w-0"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => adjustQty(1)}
                    className="p-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition-colors font-bold border border-slate-200 shrink-0"
                    disabled={isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error and Success Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {successMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
