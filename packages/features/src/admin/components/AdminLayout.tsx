"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Crown, LogOut } from "lucide-react";

interface AdminLayoutProps {
  title: string;
  subtitle: string;
  userName?: string;
  children: React.ReactNode;
}

export function AdminLayout({ title, subtitle, userName, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B1220]">
      <header className="border-b border-white/10 bg-[#111827]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#0B1220]">
              <Crown size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Super Admin Control</div>
              <div className="text-xs text-slate-400">ISP Log Server · Restricted Zone</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5"
            >
              Open Dashboard
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/super-admin" })}
              className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 ring-1 ring-red-500/20 hover:bg-red-500/20"
            >
              <LogOut size={14} />
              Secure logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {userName ? `Welcome, ${userName}` : title}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
