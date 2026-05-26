"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, ClipboardList, LogOut, Shield, Menu, X } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight">Benidex</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 min-w-0">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 bg-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all whitespace-nowrap"
            >
              <Shield size={16} />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop right */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {session?.user?.name && (
            <span className="text-sm font-medium text-slate-500 truncate max-w-[140px]">
              {session.user.name}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all whitespace-nowrap"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-100 px-4 py-3 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
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
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 bg-slate-200 hover:bg-slate-100 transition-all"
            >
              <Shield size={16} />
              Admin
            </Link>
          )}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            {session?.user?.name && (
              <span className="text-sm font-medium text-slate-500 truncate">{session.user.name}</span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all ml-auto"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}