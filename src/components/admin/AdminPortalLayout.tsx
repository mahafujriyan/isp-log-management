"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { ADMIN_NAV, PORTAL_ROUTES } from "@/constants/portal.constants";
import { useRole } from "@/hooks/useRole";
import {
  BarChart3,
  CreditCard,
  Crown,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const ICONS = {
  "layout-dashboard": LayoutDashboard,
  "bar-chart-3": BarChart3,
  users: Users,
  "credit-card": CreditCard,
  inbox: Inbox,
  settings: Settings,
} as const;

export function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useRole();
  const [open, setOpen] = useState(false);
  const name = session?.user?.username ?? session?.user?.name ?? "Admin";

  return (
    <div className="flex min-h-screen bg-[#0B1220] text-white">
      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-label="Close" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-gradient-to-b from-[#1a3c5e] to-[#0f172a] transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white">
              <Crown size={18} />
            </div>
            <div>
              <div className="text-sm font-bold">ISP LogServer</div>
              <div className="text-[10px] uppercase tracking-wider text-blue-300/80">Super Admin</div>
            </div>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ADMIN_NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-white/15 text-white shadow-inner" : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 truncate text-xs text-blue-200">{name}</div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: PORTAL_ROUTES.admin.login })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs text-white/40 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/70 transition"
          >
            <LogOut size={14} /> Secure logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 bg-[#111827]/80 px-4 py-3 backdrop-blur lg:px-6">
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="hidden text-slate-500 sm:inline">Restricted access</span>
          </div>
        </header>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-auto p-4 lg:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}
