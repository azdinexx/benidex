"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Activity, Package, Network, Bell } from "lucide-react";
import { getAllScansAction } from '@/app/actions';

export default function AdminMonitor() {
    const [liveCounts, setLiveCounts] = useState<any[]>([]);
    const [productMap, setProductMap] = useState<Record<string, { expectedQty: number, scannedQty: number }>>({});
    const [stats, setStats] = useState({ mismatches: 0, totalCounted: 0, activeUsersCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchScans() {
            try {
                const scansRes = await getAllScansAction();
                if (isMounted && scansRes.success && scansRes.data) {
                    setLiveCounts(scansRes.data.scans);
                    setProductMap(scansRes.data.productCounts);
                    setStats(scansRes.data.stats);
                }
            } catch (err) {
                console.error("Failed to fetch scans", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        
        fetchScans();
        const intervalId = setInterval(fetchScans, 5000);
        
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

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
                                            <td className="p-4 font-medium text-slate-900">{count.userName}</td>
                                            <td className="p-4 text-slate-700">{count.productName}</td>
                                            <td className="p-4 font-mono font-medium text-slate-900">+{count.quantity}</td>
                                            <td className="p-4">
                                                {count.isMismatch ?
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        <AlertCircle size={14} /> Mismatch
                                                    </span> :
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <CheckCircle2 size={14} /> Correct
                                                    </span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}