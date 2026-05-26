"use client";

import { useState, useRef, useEffect } from 'react';
import { submitCountAction, searchProductsAction } from '@/app/actions';
import { useSession } from 'next-auth/react';
import { ScanLine, CheckCircle2, AlertCircle, Loader2, Minus, Plus, Search } from 'lucide-react';
import { Product } from '@/prisma/generated/client';

export default function ScannerInterface() {
  const { data: session } = useSession();

  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [lastScan, setLastScan] = useState<{ barcode: string, qty: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);



  // Auto-clear message after 4s
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // Fetch product autocomplete suggestions as user types
  useEffect(() => {
    if (!barcode.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchProductsAction(barcode);
        if (res.success && res.data) {
          setSuggestions(res.data);
          setShowSuggestions(res.data.length > 0);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.error("Error searching products:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [barcode]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionContainerRef.current && !suggestionContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (product: Product) => {
    setBarcode(product.barcode);
    setSuggestions([]);
    setShowSuggestions(false);
    // Focus quantity input for fast typing
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);
    setShowSuggestions(false);

    try {
      const q = parseInt(quantity, 10);
      const submitQty = isNaN(q) || q <= 0 ? 1 : q;

      const formData = new FormData();
      formData.append('barcode', barcode);
      formData.append('quantity', submitQty.toString());

      const result = await submitCountAction(formData);

      if (result.success && result.data) {
        const productBarcode = (result.data as any).product?.barcode || barcode;
        setMessage({ type: 'success', text: `Scanned: ${productBarcode} (${submitQty} units)` });
        setLastScan({ barcode: productBarcode, qty: submitQty });
        // Reset inputs
        setBarcode("");
        setQuantity("1");
        inputRef.current?.focus();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to scan' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustQty = (amount: number) => {
    setQuantity((prev) => {
      const current = parseInt(prev, 10);
      const next = isNaN(current) ? 1 : current + amount;
      return next > 0 ? next.toString() : "1";
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
              <ScanLine className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Inventory Scan</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Enter reference/barcode and quantity</p>
        </div>

        <form onSubmit={handleScan} className="space-y-4">
          {/* Reference / Barcode Input */}
          <div className="relative" ref={suggestionContainerRef}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Product Reference / Barcode
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                autoFocus
                className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-10 py-4 text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-sm font-mono tracking-wide text-slate-800"
                placeholder="Type name or scan barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
            </div>

            {/* Reference Completion Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectSuggestion(p)}
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-b-0 flex justify-between items-center ${idx === activeSuggestionIndex ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"
                      }`}
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{p.barcode}</p>
                      <p className="text-xs font-mono text-slate-400">{p.barcode}</p>
                    </div>
                    {p.category && (
                      <span className="text-xxs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                        {p.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantity Input with Adjustments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quantity to Count
            </label>
            <div className="flex items-center gap-3 bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-sm">
              <button
                type="button"
                onClick={() => adjustQty(-1)}
                className="p-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition-colors font-bold"
                disabled={isSubmitting}
              >
                <Minus className="w-5 h-5" />
              </button>

              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                className="flex-1 text-center text-2xl font-bold bg-transparent outline-none text-slate-800"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting}
                placeholder="1"
              />

              <button
                type="button"
                onClick={() => adjustQty(1)}
                className="p-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition-colors font-bold"
                disabled={isSubmitting}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Submit / Clear Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => {
                setBarcode("");
                setQuantity("1");
                setSuggestions([]);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-bold transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              CLEAR
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
              disabled={isSubmitting || !barcode.trim()}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "ENTER"}
            </button>
          </div>
        </form>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}>
            {message.type === 'success'
              ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              : <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Last Scanned log */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Last Scanned Item</h3>
          {lastScan ? (
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700 truncate mr-4">{lastScan.barcode}</span>
              <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg shrink-0">+{lastScan.qty}</span>
            </div>
          ) : (
            <div className="flex justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-100 border-dashed">
              <span className="text-slate-400 text-sm font-medium italic">No items scanned yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}