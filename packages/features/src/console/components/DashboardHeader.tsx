"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, ChevronDown, LogOut, Menu, Settings, Shield } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function DashboardHeader({
  title,
  subtitle,
  clock,
  onMenuClick,
}: {
  title: string;
  subtitle: string;
  clock: string;
  onMenuClick?: () => void;
}) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = session?.user?.role ?? "viewer";
  const name = session?.user?.username ?? session?.user?.name ?? "User";
  const isSuperAdmin = role === "super_admin";

  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#E2E8F0]/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="shrink-0 rounded-xl p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A] lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-[#0F172A]">
            {title}
          </h1>
          <p className="truncate text-[12px] text-[#64748B]">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 rounded-full bg-[#E8F5E9] px-3 py-1.5 text-[11px] font-semibold text-[#2E7D32] ring-1 ring-[#C8E6C9] sm:flex">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#43A047] pulse-dot" />
          Live
        </div>
        <span className="mono hidden text-[12px] tabular-nums text-[#64748B] sm:inline">
          {clock}
        </span>

        <button
          type="button"
          className="relative rounded-xl p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#EF5350]" />
        </button>

        {isSuperAdmin && (
          <Link
            href="/admin"
            className="hidden items-center gap-1 rounded-xl bg-[#FFF8E1] px-3 py-1.5 text-[11px] font-medium text-[#E65100] ring-1 ring-[#FFE082] sm:flex"
          >
            <Shield size={13} />
            Admin Panel
          </Link>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:border-[#CBD5E1] hover:shadow"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1565C0] to-[#1976D2] text-xs font-bold text-white">
              {name[0]?.toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[12px] font-medium leading-tight text-[#0F172A]">
                {name}
              </div>
              <div className="text-[10px] capitalize text-[#94A3B8]">
                {role.replace("_", " ")}
              </div>
            </div>
            <ChevronDown size={14} className="text-[#94A3B8]" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-xl shadow-slate-200/50">
                <div className="border-b border-[#F1F5F9] px-4 py-3">
                  <div className="text-[13px] font-medium text-[#0F172A]">{name}</div>
                  <div className="text-[11px] text-[#94A3B8]">{session?.user?.email}</div>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-[12px] text-[#475569] hover:bg-[#F8FAFC]"
                >
                  <Settings size={14} />
                  Account settings
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-[12px] text-[#C62828] hover:bg-[#FFEBEE]"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
