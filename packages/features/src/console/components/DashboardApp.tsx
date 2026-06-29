"use client";

import { useEffect, useState } from "react";
import { AnalyticsPage } from "@isp/features/console/components/AnalyticsPage";
import { CompanySettingsPanel } from "@isp/features/console/components/CompanySettingsPanel";
import { DeviceManagerPanel } from "@isp/features/console/components/DeviceManagerPanel";
import { DisabledDevicesPanel } from "@isp/features/console/components/DisabledDevicesPanel";
import { LogStreamPanel } from "@isp/features/console/components/LogStreamPanel";
import { MenuManagerPanel } from "@isp/features/console/components/MenuManagerPanel";
import { RoleManagerPanel } from "@isp/features/console/components/RoleManagerPanel";
import { SearchLogPanel } from "@isp/features/console/components/SearchLogPanel";
import { ServiceInfoPanel } from "@isp/features/console/components/ServiceInfoPanel";
import { UserManagerPanel } from "@isp/features/console/components/UserManagerPanel";
import { DashboardLayout } from "@isp/features/console/components/DashboardLayout";
import { DashboardOverview } from "@isp/features/console/components/DashboardOverview";
import { PAGE_TITLES } from "@isp/core/constants/navigation.constants";
import { useTenantContext } from "@isp/auth/hooks/useTenantContext";
import { BtrcPanel } from "@isp/features/btrc/components/BtrcPanel";
import type { DashboardPageId, LogEntry } from "@isp/core/types";
import { ChevronDown } from "lucide-react";

const EMPTY_PORT_DATA = {
  https: 0,
  http: 0,
  p8080: 0,
  p9998: 0,
  dns: 0,
  other: 0,
};

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
  const { tenantId, loading: tenantLoading } = useTenantContext();
  const [page, setPage] = useState<DashboardPageId>("dashboard");
  const [clock, setClock] = useState("--:--:--");
  const [streamCount, setStreamCount] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    totalLogs: 0,
    activeUsers: 0,
    devices: 0,
    diskUsedGb: 0,
    diskTotalGb: 0,
    storageUsedMb: 0,
    storageLimitMb: 0,
    storageProvider: "",
  });
  const [hourlyData, setHourlyData] = useState<number[]>(Array(24).fill(0));
  const [portData, setPortData] = useState(EMPTY_PORT_DATA);
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
    if (tenantLoading || tenantId == null) return;

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
          storageUsedMb: m.storageUsedMb ?? prev.storageUsedMb,
          storageLimitMb: m.storageLimitMb ?? prev.storageLimitMb,
          storageProvider: m.storageProvider ?? prev.storageProvider,
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
        const portMap = { ...EMPTY_PORT_DATA };

        logs.forEach((l) => {
          uMap[l.pppoe_user] = (uMap[l.pppoe_user] ?? 0) + 1;
          iMap[l.visited_ip] = (iMap[l.visited_ip] ?? 0) + 1;
          const h = new Date(l.time).getHours();
          if (!Number.isNaN(h)) hourCounts[h] += 1;
          const port = l.port ?? l.nat_port ?? 0;
          if (port === 443) portMap.https += 1;
          else if (port === 80) portMap.http += 1;
          else if (port === 8080) portMap.p8080 += 1;
          else if (port === 9998) portMap.p9998 += 1;
          else if (port === 53) portMap.dns += 1;
          else portMap.other += 1;
        });

        setTopUsers(Object.entries(uMap).sort((a, b) => b[1] - a[1]).slice(0, 5));
        setTopIps(Object.entries(iMap).sort((a, b) => b[1] - a[1]).slice(0, 5));
        if (hourCounts.some((v) => v > 0)) setHourlyData(hourCounts);
        setPortData(portMap);
        setStreamCount(logs.length);
      })
      .catch(() => {});
  }, [tenantId, tenantLoading]);

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
