"use client";

import { useEffect, useState } from "react";
import { AnalyticsPage } from "@/components/dashboard/AnalyticsPage";
import { CompanySettingsPanel } from "@/components/dashboard/CompanySettingsPanel";
import { DeviceManagerPanel } from "@/components/dashboard/DeviceManagerPanel";
import { DisabledDevicesPanel } from "@/components/dashboard/DisabledDevicesPanel";
import { LogStreamPanel } from "@/components/dashboard/LogStreamPanel";
import { MenuManagerPanel } from "@/components/dashboard/MenuManagerPanel";
import { RoleManagerPanel } from "@/components/dashboard/RoleManagerPanel";
import { SearchLogPanel } from "@/components/dashboard/SearchLogPanel";
import { ServiceInfoPanel } from "@/components/dashboard/ServiceInfoPanel";
import { UserManagerPanel } from "@/components/dashboard/UserManagerPanel";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { PAGE_TITLES } from "@/constants/navigation.constants";
import { useTenantContext } from "@/hooks/useTenantContext";
import { BtrcPanel } from "@/components/btrc/BtrcPanel";
import type { DashboardPageId, LogEntry } from "@/types";
import { getHourlyLogCounts, getPortDistribution } from "@/services/mock-data.service";
import { ChevronDown } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

const FAQS = [
  { q: "How do I add a new MikroTik device?", a: 'Go to Server Manager → click "Add Server" → fill in Device Name, IP, NAT IP, port, and credentials → Save.' },
  { q: "Why is a device showing as Disconnected?", a: "The device has stopped sending syslog for more than 30 minutes. Check MikroTik /system logging action." },
  { q: "How do I search logs for a specific user?", a: "Go to Search Log → enter the PPPoE username → select database and time range → click Search." },
  { q: "How to set log auto-delete / retention?", a: 'Go to Company Settings → set "Log retention (days)" → Save.' },
  { q: "How do I create a new admin user?", a: 'Go to User Manager → click "Add User" → fill in username, email, password and assign a role.' },
  { q: "How to back up the database?", a: 'Go to Company Settings → Database Backup → click "Backup now".' },
  { q: "How do I submit logs to BTRC?", a: 'Go to System → BTRC Compliance → select date range → Download CSV/JSON or click "Submit to BTRC Portal".' },
];

export function DashboardApp() {
  const { tenantId } = useTenantContext();
  const [page, setPage] = useState<DashboardPageId>("dashboard");
  const [clock, setClock] = useState("--:--:--");
  const [streamCount, setStreamCount] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    totalLogs: 0,
    activeUsers: 0,
    devices: 0,
    diskUsedGb: 1264,
    diskTotalGb: 1931,
  });
  const [hourlyData, setHourlyData] = useState<number[]>(Array(24).fill(0));
  const [portData, setPortData] = useState(getPortDistribution());
  const [topUsers, setTopUsers] = useState<[string, number][]>([]);
  const [topIps, setTopIps] = useState<[string, number][]>([]);

  const pageInfo = PAGE_TITLES[page];

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    fetch(`/api/dashboard/metrics?tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then((m) => {
        setMetrics((prev) => ({
          ...prev,
          totalLogs: m.totalLogs ?? prev.totalLogs,
          activeUsers: m.activeUsers ?? prev.activeUsers,
          devices: m.devices ?? prev.devices,
          diskUsedGb: m.diskUsedGb ?? prev.diskUsedGb,
          diskTotalGb: m.diskTotalGb ?? prev.diskTotalGb,
        }));
      })
      .catch(() => {});

    fetch(`/api/logs?tenant_id=${tenantId}&limit=200`)
      .then((r) => r.json())
      .then((data) => {
        const logs: LogEntry[] = data.logs ?? [];
        if (logs.length === 0) return;

        const uMap: Record<string, number> = {};
        const iMap: Record<string, number> = {};
        const hourCounts = Array(24).fill(0);

        logs.forEach((l) => {
          uMap[l.pppoe_user] = (uMap[l.pppoe_user] ?? 0) + 1;
          iMap[l.visited_ip] = (iMap[l.visited_ip] ?? 0) + 1;
          const h = new Date(l.time).getHours();
          if (!Number.isNaN(h)) hourCounts[h] += 1;
        });

        setTopUsers(Object.entries(uMap).sort((a, b) => b[1] - a[1]).slice(0, 5));
        setTopIps(Object.entries(iMap).sort((a, b) => b[1] - a[1]).slice(0, 5));
        if (hourCounts.some((v) => v > 0)) setHourlyData(hourCounts);
        setStreamCount(logs.length);
      })
      .catch(() => {
        setHourlyData(getHourlyLogCounts());
      });
  }, [tenantId]);

  return (
    <DashboardLayout
      activePage={page}
      onNavigate={setPage}
      streamCount={streamCount}
      title={pageInfo.title}
      subtitle={pageInfo.sub}
      clock={clock}
    >
      {page === "dashboard" && (
        <DashboardOverview
          metrics={metrics}
          hourlyData={hourlyData}
          portData={portData}
          topUsers={topUsers}
          topIps={topIps}
        />
      )}
      {page === "stream" && <LogStreamPanel onStreamCount={setStreamCount} />}
      {page === "devices" && <DeviceManagerPanel variant="devices" />}
      {page === "search" && <SearchLogPanel />}
      {page === "disabled" && <DisabledDevicesPanel />}
      {page === "btrc" && <BtrcPanel />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "usermgr" && <UserManagerPanel />}
      {page === "rolemgr" && <RoleManagerPanel onOpenMenuManager={() => setPage("menumgr")} />}
      {page === "servermgr" && <DeviceManagerPanel variant="servers" />}
      {page === "menumgr" && <MenuManagerPanel />}
      {page === "serviceinfo" && <ServiceInfoPanel />}
      {page === "company" && <CompanySettingsPanel />}
      {page === "faq" && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Frequently asked questions</div>
          {FAQS.map((f, i) => (
            <div key={i} className="border-b border-[#E2E8F0] py-2.5 last:border-0">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between text-[13px] font-medium text-[#1E293B]"
              >
                {f.q}
                <ChevronDown size={16} className={openFaq === i ? "rotate-180" : ""} />
              </button>
              {openFaq === i && <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748B]">{f.a}</p>}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
