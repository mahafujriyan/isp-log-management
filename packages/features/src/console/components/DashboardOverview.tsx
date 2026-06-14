"use client";

import { MetricCard, ChartCard, PanelCard } from "@isp/features/console/components/MetricCard";
import { DiskChart, HourlyLogsChart, PortPieChart } from "@isp/features/console/components/DashboardCharts";
import { HardDrive, Router, ScrollText, Users } from "lucide-react";
import type { getPortDistribution } from "@isp/core/services/mock-data.service";

interface DashboardOverviewProps {
  metrics: {
    totalLogs: number;
    activeUsers: number;
    devices: number;
  };
  hourlyData: number[];
  portData: ReturnType<typeof getPortDistribution>;
  topUsers: [string, number][];
  topIps: [string, number][];
}

export function DashboardOverview({
  metrics,
  hourlyData,
  portData,
  topUsers,
  topIps,
}: DashboardOverviewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Logs today"
          value={metrics.totalLogs}
          sub="entries"
          color="blue"
          icon={ScrollText}
          trend="↑ Live updating"
        />
        <MetricCard
          label="Active users"
          value={metrics.activeUsers}
          sub="PPPoE sessions"
          color="green"
          icon={Users}
        />
        <MetricCard label="Disk used" value="1264 GB" sub="of 1931 GB" color="amber" icon={HardDrive} />
        <MetricCard
          label="Devices"
          value={`${metrics.devices} / ${metrics.devices}`}
          sub="connected"
          color="teal"
          icon={Router}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Disk partition">
          <DiskChart />
        </ChartCard>
        <ChartCard title="Logs / hour">
          <HourlyLogsChart data={hourlyData} />
        </ChartCard>
        <ChartCard title="Port distribution">
          <PortPieChart data={portData} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard title="Top PPPoE users">
          {topUsers.map(([user, count]) => {
            const max = topUsers[0]?.[1] ?? 1;
            return (
              <div
                key={user}
                className="flex items-center gap-2 border-b border-[#E2E8F0] py-1.5 last:border-0"
              >
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#E3F2FD] text-[10px] font-medium text-[#1565C0]">
                  {user[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">{user}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#F1F5F9]">
                    <div
                      className="h-full rounded bg-[#1976D2]"
                      style={{ width: `${Math.round((count / max) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="min-w-[28px] text-right text-[11px] text-[#64748B]">{count}</span>
              </div>
            );
          })}
        </PanelCard>
        <PanelCard title="Top visited IPs">
          {topIps.map(([ip, count]) => {
            const max = topIps[0]?.[1] ?? 1;
            return (
              <div
                key={ip}
                className="flex items-center gap-2 border-b border-[#E2E8F0] py-1.5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="mono truncate font-medium">{ip}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#F1F5F9]">
                    <div
                      className="h-full rounded bg-[#1976D2]"
                      style={{ width: `${Math.round((count / max) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="min-w-[28px] text-right text-[11px] text-[#64748B]">{count}</span>
              </div>
            );
          })}
        </PanelCard>
      </div>

      <PanelCard title="Disk partitions">
        {[
          { path: "/mnt/data/mysql", label: "log partition", used: 1264, total: 1931, pct: 65, warn: true },
          { path: "/var/lib/postgresql", label: "", used: 128, total: 256, pct: 50, warn: false },
        ].map((d) => (
          <div key={d.path} className="mb-3 last:mb-0">
            <div className="mb-1 flex justify-between text-[12px]">
              <span>
                <b>{d.path}</b>
                {d.label ? ` — ${d.label}` : ""}
              </span>
              <span className="text-[#64748B]">
                {d.used} GB / {d.total} GB
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className={`h-full rounded-full ${d.warn ? "bg-[#E65100]" : "bg-[#1976D2]"}`}
                style={{ width: `${d.pct}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[11px] text-[#64748B]">
              <span>{d.pct}% used</span>
              <span className={d.warn ? "text-[#E65100]" : "text-[#2E7D32]"}>
                {d.warn ? "Warning" : "Healthy"}
              </span>
            </div>
          </div>
        ))}
      </PanelCard>
    </div>
  );
}
