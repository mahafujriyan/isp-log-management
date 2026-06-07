"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import type { DashboardPageId } from "@/types";

interface DashboardLayoutProps {
  activePage: DashboardPageId;
  onNavigate: (page: DashboardPageId) => void;
  streamCount?: number;
  title: string;
  subtitle: string;
  clock: string;
  children: React.ReactNode;
}

export function DashboardLayout({
  activePage,
  onNavigate,
  streamCount = 0,
  title,
  subtitle,
  clock,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const handleNavigate = useCallback(
    (page: DashboardPageId) => {
      onNavigate(page);
      setSidebarOpen(false);
    },
    [onNavigate]
  );

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-[#EEF2F7]">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 shrink-0 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          streamCount={streamCount}
          onClose={closeSidebar}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          clock={clock}
          onMenuClick={openSidebar}
        />
        <main className="dashboard-scroll flex-1 overflow-y-auto p-4 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
