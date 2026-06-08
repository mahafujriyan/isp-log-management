"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { OPERATOR_NAV, PORTAL_ROUTES } from "@/constants/portal.constants";
import { useRole } from "@/hooks/useRole";
import {
  Activity,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeft,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const ICONS = {
  "layout-dashboard": LayoutDashboard,
  activity: Activity,
  users: Users,
  "file-bar-chart": FileBarChart,
  "panel-left": PanelLeft,
} as const;

export function OperatorPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, isDemo, demoExpiresAt } = useRole();
  const [open, setOpen] = useState(false);
  const name = session?.user?.username ?? session?.user?.name ?? "Operator";

  return (
    <div className="flex min-h-screen bg-[#04090f]">
      {open && (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Close" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(260px,85vw)] flex-col border-r border-white/[0.07] bg-gradient-to-b from-[#071525] to-[#04090f] text-white shadow-xl transition-transform lg:static lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <div className="text-sm font-bold">ISP LogServer</div>
            <div className="text-[10px] uppercase tracking-wider text-blue-300/70">
              {isDemo ? "Demo · Full Portal" : "Operator Portal"}
            </div>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {OPERATOR_NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-blue-500/15 text-white" : "text-white/50 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 truncate text-xs text-white/50">{name}</div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: PORTAL_ROUTES.operator.login })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/[0.07] bg-[#071525]/90 px-4 py-5 text-white backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-1.5 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold lg:text-2xl">Operator Dashboard</h1>
              <p className="text-sm text-white/40">
                {isDemo
                  ? "Same operator portal as production — sandbox data only"
                  : "Monitor networks and manage connections"}
              </p>
            </div>
          </div>
          {isDemo && demoExpiresAt && (
            <div className="mt-3 inline-flex rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[12px] text-blue-200">
              Demo access until {new Date(demoExpiresAt).toLocaleString()}
            </div>
          )}
        </header>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-auto bg-[#04090f] p-4 lg:p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

export function OperatorStatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02, y: -4 }}
      className={`rounded-xl border border-white/[0.08] p-5 text-white shadow-lg ${color}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </motion.div>
  );
}
