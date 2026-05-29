"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Activity, Package, Network, Bell, X, Loader2, Minus, Plus } from "lucide-react";
import { getAllScansAction, correctMismatchAction, getProductCountsAction } from '@/app/actions';
import { MismatchType } from '@/prisma/generated';

type Scan = {
    id: string;
    productId: string;
    timestamp: Date;
    userName: string;
    productName: string;
    quantity: number;
    isMismatch: boolean;
    location: string;
    mismatchType: MismatchType;
}

export default function AdminMonitor() {
    const [liveCounts, setLiveCounts] = useState<Scan[]>([]);
    const [productMap, setProductMap] = useState<Record<string, { qty: number, scannedQty: number }>>({});
    const [stats, setStats] = useState({ mismatches: 0, totalCounted: 0, activeUsersCount: 0 });
    const [loading, setLoading] = useState(true);

    // Correction Modal State
    const [correctingScan, setCorrectingScan] = useState<Scan | null>(null);
    const [correctQty, setCorrectQty] = useState<string>("1");
    const [comparisonCounts, setComparisonCounts] = useState<Array<{ id: string, groupName: string, quantity: number, location: string, timestamp: Date }>>([]);
    const [fetchingComparison, setFetchingComparison] = useState(false);
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    async function fetchScans() {
        try {
            const scansRes = await getAllScansAction();
            if (scansRes.success && scansRes.data) {
                // Assert or map scansRes.data.scans to Scan[] since type now matches
                setLiveCounts(scansRes.data.scans as any);
                setProductMap(scansRes.data.productCounts);
                setStats(scansRes.data.stats);
            }
        } catch (err) {
            console.error("Failed to fetch scans", err);
        }
    }

    useEffect(() => {
        let isMounted = true;
        async function initFetch() {
            await fetchScans();
            if (isMounted) setLoading(false);
        }

        initFetch();
        const intervalId = setInterval(() => {
            if (isMounted) fetchScans();
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const openCorrectionModal = async (scan: Scan) => {
        setCorrectingScan(scan);
        setCorrectQty(scan.quantity.toString());
        setComparisonCounts([]);
        setFetchingComparison(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            const res = await getProductCountsAction(scan.productId);
            if (res.success && res.data) {
                setComparisonCounts(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch product counts for correction:", err);
        } finally {
            setFetchingComparison(false);
        }
    };

    const closeCorrectionModal = () => {
        setCorrectingScan(null);
    };

    const adjustQty = (amount: number) => {
        setCorrectQty((prev) => {
            const current = parseInt(prev, 10);
            const next = isNaN(current) ? 1 : current + amount;
            return next >= 0 ? next.toString() : "0";
        });
    };

    const handleCorrect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!correctingScan || isSubmittingCorrection) return;

        setIsSubmittingCorrection(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const q = parseInt(correctQty, 10);
        if (isNaN(q) || q < 0) {
            setErrorMsg("Please enter a valid quantity.");
            setIsSubmittingCorrection(false);
            return;
        }

        const formData = new FormData();
        formData.append("productId", correctingScan.productId);
        formData.append("correctQuantity", q.toString());

        try {
            const res = await correctMismatchAction(formData);
            if (res.success) {
                setSuccessMsg("Mismatch resolved successfully!");
                await fetchScans();
                setTimeout(() => {
                    closeCorrectionModal();
                }, 1000);
            } else {
                setErrorMsg(res.error || "Failed to resolve mismatch.");
            }
        } catch (err) {
            setErrorMsg("Failed to resolve mismatch.");
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    // Stats are now purely server-driven and updated via fetchScans



    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Activity className="text-blue-600" /> Live Monitor
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Real-time inventory updates</p>
                    </div>
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Auto-Updating
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Items Scanned</p>
                            <h3 className="text-3xl font-bold text-slate-900">{stats.totalCounted}</h3>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl shadow-sm border flex items-center gap-4 transition-colors ${stats.mismatches > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                        <div className={`p-4 rounded-xl ${stats.mismatches > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${stats.mismatches > 0 ? 'text-red-700' : 'text-slate-500'}`}>Discrepancies</p>
                            <h3 className={`text-3xl font-bold ${stats.mismatches > 0 ? 'text-red-700' : 'text-slate-900'}`}>{stats.mismatches}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-purple-50 p-4 rounded-xl text-purple-600">
                            <Network size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Active Groups</p>
                            <h3 className="text-3xl font-bold text-slate-900">{stats.activeUsersCount}</h3>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Bell className="text-slate-400" size={20} /> Recent Activity Feed
                        </h2>
                    </div>

                    {liveCounts.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p>Waiting for incoming scans...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                                        <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {liveCounts.map((count, i) => (
                                        <tr key={i} className={`transition-colors hover:bg-slate-50 ${count.isMismatch ? 'bg-red-50/50 hover:bg-red-50' : ''}`}>
                                            <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{new Date(count.timestamp).toLocaleTimeString()}</td>
                                            <td className="p-4 font-medium text-slate-900 flex flex-col"><span>{count.userName}</span>
                                                <span className="text-gray-600 font-semibold">{count.location}</span></td>
                                            <td className="p-4 text-slate-700">{count.productName}</td>
                                            <td className="p-4 font-mono font-medium text-slate-900">+{count.quantity}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {count.isMismatch ? (
                                                        <>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                                <AlertCircle size={14} /> Mismatch {count.mismatchType}
                                                            </span>
                                                            <button
                                                                onClick={() => openCorrectionModal(count)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
                                                            >
                                                                Correct
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            <CheckCircle2 size={14} /> Correct
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Correction Modal */}
            {correctingScan && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 transform transition-all scale-100">
                        {/* Modal Header */}
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Resolve Mismatch</h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">Product Ref: {correctingScan.productName}</p>
                            </div>
                            <button
                                onClick={closeCorrectionModal}
                                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Comparison list */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Counts Comparison</h4>
                                {fetchingComparison ? (
                                    <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                        <span>Loading counts...</span>
                                    </div>
                                ) : comparisonCounts.length === 0 ? (
                                    <p className="text-slate-400 text-sm italic">No counts found.</p>
                                ) : (
                                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                                        {comparisonCounts.map((cc) => (
                                            <div key={cc.id} className="p-3 flex justify-between items-center text-sm gap-2">
                                                <div>
                                                    <span className="font-semibold text-slate-800">{cc.groupName}</span>
                                                    <span className="text-slate-500 text-xs ml-2 bg-slate-200 px-1.5 py-0.5 rounded font-mono">{cc.location}</span>
                                                </div>
                                                <span className="font-bold text-slate-900 text-base">+{cc.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Correction Form */}
                            <form onSubmit={handleCorrect} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Corrected Official Quantity
                                    </label>
                                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => adjustQty(-1)}
                                            className="p-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition-colors font-bold border border-slate-200 shrink-0"
                                            disabled={isSubmittingCorrection}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            className="flex-1 text-center text-lg font-bold bg-transparent outline-none text-slate-800 min-w-0"
                                            value={correctQty}
                                            onChange={(e) => setCorrectQty(e.target.value)}
                                            disabled={isSubmittingCorrection}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => adjustQty(1)}
                                            className="p-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition-colors font-bold border border-slate-200 shrink-0"
                                            disabled={isSubmittingCorrection}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Status Messages */}
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
                                        onClick={closeCorrectionModal}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                                        disabled={isSubmittingCorrection}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                                        disabled={isSubmittingCorrection || fetchingComparison}
                                    >
                                        {isSubmittingCorrection ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Correction"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}