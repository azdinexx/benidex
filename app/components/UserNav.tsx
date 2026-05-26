"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, ClipboardList, LogOut, Ampersand, Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/user", label: "Home", icon: Home, exact: true },
  { href: "/user/scan", label: "Scan", icon: ScanLine },
  { href: "/user/counts", label: "My Counts", icon: ClipboardList },
];

export default function UserNav() {
  const [role, setRole] = useState<"user" | "admin">("user");
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await fetch("/api/user/role");
        const data = await res.json();
        setRole(data.role);
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };

    fetchUserRole();
  }, []);


  return (
    <header className="bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight">Benidex</span>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}

            {role === "admin" && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-slate-800 font-semibold bg-slate-200 hover:bg-slate-100 hover:text-slate-900`}
              >
                <Shield size={16} />
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {session?.user?.name && (
            <span className="text-sm font-medium text-slate-500">{session.user.name}</span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
