"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { TenantManager } from "@/components/admin/TenantManager";
import { Building2, Crown, Database, LogOut, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [tenantCount, setTenantCount] = useState(0);

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTenantCount(data.length);
      })
      .catch(() => {});
  }, []);

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
            Welcome, {session?.user?.username ?? "Admin"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            System-wide tenant management and platform configuration
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Building2, label: "Active Tenants", value: tenantCount || "—", color: "text-amber-400" },
            { icon: Users, label: "Platform Users", value: "3", color: "text-blue-400" },
            { icon: Database, label: "Database", value: "PostgreSQL", color: "text-green-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            >
              <stat.icon size={20} className={`mb-3 ${stat.color}`} />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <TenantManager variant="dark" />
      </main>
    </div>
  );
}
