"use client";

import { useState, useTransition } from "react";
import { importProductsAction } from "@/app/actions";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Product = {
  id: string;
  barcode: string;
  expectedQty: number | null;
  category: string | null;
  price: number | null;
  baselineGroupId: string | null;
};

export default function ProductsPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;
    setImportStatus(null);

    const fd = new FormData();
    fd.append("file", selectedFile);

    startTransition(async () => {
      const res = await importProductsAction(fd);
      if (res.success && res.data) {
        setImportStatus({ type: "success", message: `Successfully imported/updated ${res.data.count} products.` });
        setSelectedFile(null);
        // Refresh would require a router.refresh() here; products list will update on next server render
      } else {
        setImportStatus({ type: "error", message: res.error || "Import failed" });
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 mt-1">{products.length} products in database</p>
        </div>
      </div>

      {/* Import Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-50 p-2 rounded-xl text-green-600">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Import from Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Required columns: <span className="font-mono bg-slate-100 px-1 rounded">ref</span>{" "}
              <span className="font-mono bg-slate-100 px-1 rounded">name</span>{" "}
              <span className="font-mono bg-slate-100 px-1 rounded">category</span>{" "}
              <span className="font-mono bg-slate-100 px-1 rounded">price</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleImport} className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 rounded-xl px-5 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-slate-600 font-medium">
            <Upload size={16} />
            {selectedFile ? selectedFile.name : "Choose .xlsx file"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            type="submit"
            disabled={!selectedFile || isPending}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </button>
        </form>

        {importStatus && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
            importStatus.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {importStatus.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {importStatus.message}
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 italic">No products yet. Import an Excel file to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  {["Ref / Barcode", "Name", "Category", "Price", "Baseline Qty"].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">{p.barcode}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{p.barcode}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">{p.category || "—"}</td>
                      <td className="px-6 py-3 text-sm text-slate-500">{p.price !== null ? `$${p.price.toFixed(2)}` : "—"}</td>
                      <td className="px-6 py-3 text-sm">
                        {p.expectedQty !== null ? (
                          <span className="font-mono font-semibold text-slate-900">{p.expectedQty}</span>
                        ) : (
                          <span className="italic text-slate-400">Uncounted</span>
                        )}
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
