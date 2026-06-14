"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Cpu,
  FileCheck,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PlugZap,
  Router,
  Search,
  Server,
  Shield,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "@isp/ui/NavLink";
import type { DashboardPageId } from "@isp/core/types";

interface NavItem {
  id: DashboardPageId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const mainNav: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} strokeWidth={2} /> },
  { id: "stream", label: "Log Stream", icon: <Activity size={16} strokeWidth={2} /> },
  { id: "devices", label: "Devices", icon: <Router size={16} strokeWidth={2} /> },
  { id: "search", label: "Search Log", icon: <Search size={16} strokeWidth={2} /> },
  { id: "disabled", label: "Disabled Devices", icon: <PlugZap size={16} strokeWidth={2} /> },
];

const adminNav: NavItem[] = [
  { id: "usermgr", label: "User Manager", icon: <Users size={16} strokeWidth={2} /> },
  { id: "rolemgr", label: "Role Manager", icon: <Shield size={16} strokeWidth={2} /> },
  { id: "servermgr", label: "Server Manager", icon: <Server size={16} strokeWidth={2} /> },
  { id: "menumgr", label: "Menu Manager", icon: <PanelLeft size={16} strokeWidth={2} /> },
];

const systemNav: NavItem[] = [
  { id: "serviceinfo", label: "Service Info", icon: <Cpu size={16} strokeWidth={2} /> },
  { id: "btrc", label: "BTRC Compliance", icon: <FileCheck size={16} strokeWidth={2} /> },
  { id: "company", label: "Company Settings", icon: <Building2 size={16} strokeWidth={2} /> },
  { id: "faq", label: "FAQ", icon: <HelpCircle size={16} strokeWidth={2} /> },
];

interface SidebarProps {
  activePage: DashboardPageId;
  onNavigate: (page: DashboardPageId) => void;
  streamCount?: number;
  onClose?: () => void;
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
      {label}
    </div>
  );
}

export function Sidebar({ activePage, onNavigate, streamCount = 0, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const [allowedPages, setAllowedPages] = useState<Set<DashboardPageId> | null>(null);

  useEffect(() => {
    fetch("/api/menus?forRole=current")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllowedPages(new Set(data.map((row: { page_id: DashboardPageId }) => row.page_id)));
        }
      })
      .catch(() => {});
  }, [session?.user?.role]);

  const filterNav = (items: NavItem[]) =>
    allowedPages ? items.filter((item) => allowedPages.has(item.id)) : items;

  const streamNav = filterNav(
    mainNav.map((item) => (item.id === "stream" ? { ...item, badge: streamCount } : item))
  );
  const visibleAdminNav = filterNav(adminNav);
  const visibleSystemNav = filterNav(systemNav);

  return (
    <aside className="flex h-full w-[min(280px,85vw)] shrink-0 flex-col border-r border-[#E2E8F0]/80 bg-white shadow-sm shadow-slate-200/30 lg:w-[220px]">
      {/* Brand */}
      <div className="border-b border-[#F1F5F9] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1565C0] to-[#0D47A1] text-sm font-bold text-white shadow-md shadow-blue-600/30">
              CL
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight text-[#0F172A]">
                Cyber Link
              </div>
              <div className="text-[11px] text-[#94A3B8]">Communication</div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A] lg:hidden"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-scroll flex-1 overflow-y-auto py-1">
        <NavSection label="Main" />
        {streamNav.map((item) => (
          <NavLink
            key={item.id}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            active={activePage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        {visibleAdminNav.length > 0 && (
          <>
            <NavSection label="Admin" />
            {visibleAdminNav.map((item) => (
              <NavLink
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={activePage === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </>
        )}

        {visibleSystemNav.length > 0 && (
          <>
            <NavSection label="System" />
            {visibleSystemNav.map((item) => (
              <NavLink
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={activePage === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer user + logout */}
      <div className="border-t border-[#F1F5F9] p-4">
        <div className="mb-3 rounded-xl bg-[#F8FAFC] p-3 ring-1 ring-[#E2E8F0]">
          <div className="text-[11px] font-medium text-[#0F172A]">
            {session?.user?.username ?? session?.user?.name ?? "User"}
          </div>
          <div className="text-[10px] capitalize text-[#94A3B8]">
            {(session?.user?.role ?? "viewer").replace("_", " ")}
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] py-2 text-[12px] font-medium text-[#64748B] transition hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#C62828]"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
