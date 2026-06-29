"use client";

import { MetricCard, ChartCard, PanelCard } from "@isp/features/console/components/MetricCard";
import { DiskChart, HourlyLogsChart, PortPieChart } from "@isp/features/console/components/DashboardCharts";
import { HardDrive, Router, ScrollText, Users } from "lucide-react";

interface DashboardOverviewProps {
  metrics: {
    totalLogs: number;
    activeUsers: number;
    devices: number;
    diskUsedGb?: number;
    diskTotalGb?: number;
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
          label="Disk used"
          value={metrics.diskTotalGb ? `${metrics.diskUsedGb ?? 0} GB` : "—"}
          sub={metrics.diskTotalGb ? `of ${metrics.diskTotalGb} GB` : "not configured"}
          color="amber"
          icon={HardDrive}
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
        <ChartCard title="Disk partition">
          <DiskChart usedGb={metrics.diskUsedGb} totalGb={metrics.diskTotalGb} />
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
        {metrics.diskTotalGb ? (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[12px]">
              <span>
                <b>/mnt/data/logs</b> — log partition
              </span>
              <span className="text-[#64748B]">
                {metrics.diskUsedGb ?? 0} GB / {metrics.diskTotalGb} GB
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className="h-full rounded-full bg-[#1976D2]"
                style={{
                  width: `${Math.min(100, Math.round(((metrics.diskUsedGb ?? 0) / metrics.diskTotalGb) * 100))}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-[#64748B]">No disk metrics configured — connect server monitoring for live data.</p>
        )}
      </PanelCard>
    </div>
  );
}
