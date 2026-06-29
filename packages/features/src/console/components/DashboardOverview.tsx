"use client";

import { MetricCard, ChartCard, PanelCard } from "@isp/features/console/components/MetricCard";
import { DiskChart, HourlyLogsChart, PortPieChart } from "@isp/features/console/components/DashboardCharts";
import { HardDrive, Router, ScrollText, Users } from "lucide-react";
import { formatStorageMb, formatStoragePair } from "@isp/features/console/utils/format-storage";

interface DashboardOverviewProps {
  metrics: {
    totalLogs: number;
    activeUsers: number;
    devices: number;
    diskUsedGb?: number;
    diskTotalGb?: number;
    storageUsedMb?: number;
    storageLimitMb?: number;
    storageProvider?: string;
  };
  hourlyData: number[];
  portData: {
    https: number;
    http: number;
    p8080: number;
    p9998: number;
    dns: number;
    other: number;
  };
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
  const usedMb = metrics.storageUsedMb ?? (metrics.diskUsedGb ?? 0) * 1024;
  const limitMb = metrics.storageLimitMb ?? (metrics.diskTotalGb ?? 0) * 1024;
  const hasStorage = limitMb > 0;
  const usagePct = hasStorage ? Math.min(100, Math.round((usedMb / limitMb) * 100)) : 0;
  const provider = metrics.storageProvider || "Database";

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
        <MetricCard
          label="DB storage"
          value={hasStorage ? formatStorageMb(usedMb) : "—"}
          sub={hasStorage ? `${formatStorageMb(limitMb)} limit · ${provider}` : "loading…"}
          color="amber"
          icon={HardDrive}
          trend={hasStorage ? `${usagePct}% used` : undefined}
        />
        <MetricCard
          label="Devices"
          value={`${metrics.devices} / ${metrics.devices}`}
          sub="connected"
          color="teal"
          icon={Router}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title={`${provider} storage`}>
          <DiskChart usedMb={usedMb} limitMb={limitMb} />
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
          {topUsers.length === 0 ? (
            <p className="text-[12px] text-[#64748B]">No user data yet</p>
          ) : (
          topUsers.map(([user, count]) => {
            const max = topUsers[0]?.[1] ?? 1;
            return (
              <div
                key={user || "unknown"}
                className="flex items-center gap-2 border-b border-[#E2E8F0] py-1.5 last:border-0"
              >
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#E3F2FD] text-[10px] font-medium text-[#1565C0]">
                  {(user?.[0] ?? "?").toUpperCase()}
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
          })
          )}
        </PanelCard>
        <PanelCard title="Top visited IPs">
          {topIps.length === 0 ? (
            <p className="text-[12px] text-[#64748B]">No IP data yet</p>
          ) : (
          topIps.map(([ip, count]) => {
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
          })
          )}
        </PanelCard>
      </div>

      <PanelCard title="Database storage">
        {hasStorage ? (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[12px]">
              <span>
                <b>{provider}</b> — live from <code className="text-[11px]">pg_database_size()</code>
              </span>
              <span className="text-[#64748B]">{formatStoragePair(usedMb, limitMb)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className={`h-full rounded-full ${usagePct >= 85 ? "bg-[#E65100]" : "bg-[#1976D2]"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[11px] text-[#64748B]">
              <span>{usagePct}% used</span>
              <span className={usagePct >= 85 ? "text-[#E65100]" : "text-[#2E7D32]"}>
                {usagePct >= 85 ? "Near limit" : "Healthy"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-[#64748B]">Reading storage from Prisma Postgres…</p>
        )}
      </PanelCard>
    </div>
  );
}
