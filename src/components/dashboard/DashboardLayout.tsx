"use client";

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
  return (
    <div className="flex h-screen bg-[#EEF2F7]">
      <Sidebar activePage={activePage} onNavigate={onNavigate} streamCount={streamCount} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title={title} subtitle={subtitle} clock={clock} />
        <main className="dashboard-scroll flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
