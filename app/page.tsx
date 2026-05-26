import Link from "next/link";
import { ScanLine, Activity, LogIn, ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "./lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-500/30">
              <ScanLine className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight">
            Benidex <span className="text-blue-600">Inventory</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            Next-generation inventory management. Real-time scanning, monitoring, and precise reconciliation.
          </p>
        </div>

        {!session ? (
          <div className="pt-8">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 group"
            >
              Sign In to Continue
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <Link 
              href="/user/scan"
              className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all flex flex-col items-center text-center gap-4"
            >
              <div className="bg-blue-50 p-5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
                <ScanLine className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Scanner Interface</h3>
                <p className="text-slate-500 font-medium">Fast, reliable barcode scanning for warehouse operatives.</p>
              </div>
            </Link>

            <Link 
              href="/admin/monitor"
              className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:purple-100 transition-all flex flex-col items-center text-center gap-4"
            >
              <div className="bg-purple-50 p-5 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-600">
                <Activity className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Live Monitor</h3>
                <p className="text-slate-500 font-medium">Real-time session overview and discrepancy tracking.</p>
              </div>
            </Link>
          </div>
        )}

        {session && (
          <p className="text-slate-500 font-medium pt-8">
            Logged in as <span className="font-bold text-slate-900">{session.user?.name || session.user?.email}</span>
          </p>
        )}
      </div>
    </div>
  );
}
