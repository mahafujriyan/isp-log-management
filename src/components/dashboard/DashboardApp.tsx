"use client";

import { useEffect, useState } from "react";
import { AnalyticsPage } from "@/components/dashboard/AnalyticsPage";
import { MenuManagerPanel } from "@/components/dashboard/MenuManagerPanel";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { LogsTable } from "@/components/dashboard/LogsTable";
import { SystemChart } from "@/components/dashboard/DashboardCharts";
import { PAGE_TITLES } from "@/constants/navigation.constants";
import { BtrcPanel } from "@/components/btrc/BtrcPanel";
import { Tag } from "@/components/shared/Tag";
import type { DashboardPageId, LogEntry } from "@/types";
import {
  DEMO_ADMIN_USERS,
  DEMO_DEVICES,
  generateMockLogEntry,
  getHourlyLogCounts,
  getPortDistribution,
} from "@/services/mock-data.service";
import {
  ChevronDown,
  Download,
  Edit,
  Key,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");

export function DashboardApp() {
  const [page, setPage] = useState<DashboardPageId>("dashboard");
  const [clock, setClock] = useState("--:--:--");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streamCount, setStreamCount] = useState(0);
  const [metrics, setMetrics] = useState({
    totalLogs: 0,
    activeUsers: 0,
    devices: 2,
  });
  const [hourlyData, setHourlyData] = useState<number[]>(Array(24).fill(0));
  const [portData, setPortData] = useState(getPortDistribution());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LogEntry[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [userMap, setUserMap] = useState<Record<string, number>>({});
  const [ipMap, setIpMap] = useState<Record<string, number>>({});

  const today = new Date().toISOString().split("T")[0];
  const pageInfo = PAGE_TITLES[page];

  useEffect(() => {
    const initial = Array.from({ length: 40 }, () => generateMockLogEntry());
    setLogs(initial);
    setStreamCount(initial.length);
    setHourlyData(getHourlyLogCounts());
    setPortData(getPortDistribution());

    const uMap: Record<string, number> = {};
    const iMap: Record<string, number> = {};
    initial.forEach((l) => {
      uMap[l.pppoe_user] = (uMap[l.pppoe_user] ?? 0) + 1;
      iMap[l.visited_ip] = (iMap[l.visited_ip] ?? 0) + 1;
    });
    setUserMap(uMap);
    setIpMap(iMap);
    setMetrics({ totalLogs: initial.length, activeUsers: Object.keys(uMap).length, devices: 2 });

    fetch("/api/dashboard/metrics")
      .then((r) => r.json())
      .then((m) => setMetrics((prev) => ({ ...prev, totalLogs: m.totalLogs, activeUsers: m.activeUsers })))
      .catch(() => {});

    const streamInterval = setInterval(() => {
      const batch = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () =>
        generateMockLogEntry()
      );
      setLogs((prev) => [...batch, ...prev].slice(0, 150));
      setStreamCount((c) => c + batch.length);
      setMetrics((m) => ({
        ...m,
        totalLogs: m.totalLogs + batch.length,
      }));
      batch.forEach((l) => {
        setUserMap((u) => ({ ...u, [l.pppoe_user]: (u[l.pppoe_user] ?? 0) + 1 }));
        setIpMap((i) => ({ ...i, [l.visited_ip]: (i[l.visited_ip] ?? 0) + 1 }));
      });
    }, 2000);

    const clockInterval = setInterval(() => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    }, 1000);

    return () => {
      clearInterval(streamInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const topUsers = Object.entries(userMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topIps = Object.entries(ipMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  function doSearch() {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchResults(
      logs.filter(
        (l) =>
          l.pppoe_user.toLowerCase().includes(q) ||
          l.user_ip.includes(q) ||
          l.visited_ip.includes(q) ||
          l.mac.toLowerCase().includes(q)
      )
    );
  }

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

      {page === "stream" && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <select className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]">
                  <option>1 — Exabye_Core (NAT)</option>
                  <option>2 — CyberHome-DIS (ACCESS)</option>
                </select>
                <input type="date" defaultValue={today} className="w-[140px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
                <div className="flex items-center gap-1.5 rounded-md bg-[#E8F5E9] px-2.5 py-1 text-[12px] font-medium text-[#2E7D32]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#43A047] pulse-dot" />
                  Streaming
                </div>
                <span className="ml-auto text-[12px] text-[#64748B]">{Math.min(logs.length, 150)} rows</span>
                <button type="button" onClick={() => setLogs([])} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px] text-[#64748B] hover:bg-[#F8FAFC]">
                  Clear
                </button>
              </div>
              <LogsTable logs={logs.slice(0, 150)} />
            </div>
          )}

          {page === "devices" && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <input placeholder="Search device..." className="w-[200px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
                <button type="button" className="ml-auto flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white">
                  <Plus size={13} /> Add Device
                </button>
              </div>
              <DeviceTable />
            </div>
          )}

          {page === "search" && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="mb-2.5 grid grid-cols-4 gap-3">
                <div>
                  <div className="mb-1 text-[12px] text-[#64748B]">PPPoE username / IP</div>
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. clc05@sohel3" className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
                </div>
                <div>
                  <div className="mb-1 text-[12px] text-[#64748B]">MAC address</div>
                  <input placeholder="e.g. CC:2D:..." className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
                </div>
                <div>
                  <div className="mb-1 text-[12px] text-[#64748B]">Database</div>
                  <select className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]">
                    <option>Exabye_Core</option>
                    <option>CyberHome-DIS</option>
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-[12px] text-[#64748B]">Time range</div>
                  <select className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]">
                    <option>Last 1 hour</option>
                    <option>Last 6 hours</option>
                    <option>Last 24 hours</option>
                    <option>Last 7 days</option>
                  </select>
                </div>
              </div>
              <div className="mb-3 flex gap-2">
                <button type="button" onClick={doSearch} className="rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white">
                  Search
                </button>
                <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px]">
                  Clear
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#64748B]">Enter criteria above to search logs</div>
              ) : (
                <>
                  <div className="mb-2 text-[12px] text-[#64748B]">Found {searchResults.length} result(s)</div>
                  <LogsTable logs={searchResults.slice(0, 50)} compact />
                </>
              )}
            </div>
          )}

          {page === "disabled" && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#64748B]">
                <PlugZapIcon />
                <div className="font-medium text-[#1E293B]">No disabled devices</div>
                <div className="text-[12px]">Devices that stop sending logs for more than 30 minutes will appear here automatically.</div>
                <div className="mt-2 flex gap-2">
                  {DEMO_DEVICES.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[11px]">
                      {d.name} — <span className="font-medium text-[#2E7D32]">Active</span>
                    </span>
                  ))}
                </div>
                <button type="button" className="mt-2 flex items-center gap-1 rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px]">
                  <RefreshCw size={13} /> Re-check device status
                </button>
              </div>
            </div>
          )}

          {page === "btrc" && <BtrcPanel />}

          {page === "analytics" && <AnalyticsPage />}

          {(page === "usermgr" || page === "rolemgr" || page === "servermgr" || page === "menumgr" || page === "serviceinfo" || page === "company" || page === "faq") && (
            <AdminPages page={page} openFaq={openFaq} setOpenFaq={setOpenFaq} today={today} />
          )}
    </DashboardLayout>
  );
}

function PlugZapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
      <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

function DeviceTable() {
  return (
    <div className="dashboard-scroll max-h-[320px] overflow-y-auto rounded-lg border border-[#E2E8F0]">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
            {["#", "Device Name", "Device IP", "Config", "NAT IP", "User", "Port", "Listen", "Status", "Users Today", "Action"].map((h) => (
              <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DEMO_DEVICES.map((d) => (
            <tr key={d.id} className="hover:bg-[#F8FAFC]">
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{d.id}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 font-medium">{d.name}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.ip}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                <Tag variant={d.config === "NAT" ? "nat" : "acc"}>{d.config}</Tag>
              </td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.nat_ip}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.user}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{d.port}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{d.listen_port}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5"><Tag variant="ok">● Receiving</Tag></td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center">{d.users_today}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                <Edit size={15} className="mr-1.5 inline cursor-pointer text-[#1565C0]" />
                <Trash2 size={15} className="mr-1.5 inline cursor-pointer text-[#C62828]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminPages({
  page,
  openFaq,
  setOpenFaq,
  today,
}: {
  page: DashboardPageId;
  openFaq: number | null;
  setOpenFaq: (n: number | null) => void;
  today: string;
}) {
  const faqs = [
    { q: "How do I add a new MikroTik device?", a: 'Go to Server Manager → click "Add Server" → fill in Device Name, IP, NAT IP, port, and credentials → Save.' },
    { q: "Why is a device showing as Disconnected?", a: "The device has stopped sending syslog for more than 30 minutes. Check MikroTik /system logging action." },
    { q: "How do I search logs for a specific user?", a: "Go to Search Log → enter the PPPoE username → select database and time range → click Search." },
    { q: "How to set log auto-delete / retention?", a: 'Go to Company Settings → set "Log retention (days)" → Save.' },
    { q: "How do I create a new admin user?", a: 'Go to User Manager → click "Add User" → fill in username, email, password and assign a role.' },
    { q: "How to back up the database?", a: 'Go to Company Settings → Database Backup → click "Backup now".' },
    { q: "How do I submit logs to BTRC?", a: 'Go to System → BTRC Compliance → select date range → Download CSV/JSON or click "Submit to BTRC Portal". Configure your ISP license and BTRC API URL in settings.' },
  ];

  if (page === "usermgr") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <input placeholder="Search users..." className="w-[200px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
          <button type="button" className="ml-auto flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white">
            <Plus size={13} /> Add User
          </button>
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
              {["#", "Username", "Email", "Role", "Last Login", "Status", "Action"].map((h) => (
                <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEMO_ADMIN_USERS.map((u) => (
              <tr key={u.id} className="hover:bg-[#F8FAFC]">
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{u.id}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 font-medium">{u.username}</td>
                <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{u.email}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  <Tag variant={u.role === "Super Admin" ? "sa" : u.role === "Operator" ? "op" : "vw"}>{u.role}</Tag>
                </td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{u.last_login}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  <Tag variant={u.status === "Active" ? "ok" : "warn"}>{u.status}</Tag>
                </td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  <Edit size={15} className="mr-1.5 inline cursor-pointer text-[#1565C0]" />
                  <Key size={15} className="mr-1.5 inline cursor-pointer text-[#E65100]" />
                  <Trash2 size={15} className="inline cursor-pointer text-[#C62828]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (page === "serviceinfo") {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Core services</div>
            {["PostgreSQL v14.11", "rsyslog UDP+TCP 514", "Kestrel .NET 8", "Nginx HTTPS 443"].map((s) => (
              <div key={s} className="flex items-center justify-between border-b border-[#E2E8F0] py-2 last:border-0">
                <span className="text-[13px] font-medium">{s}</span>
                <Tag variant="ok">Running</Tag>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">CPU & Memory — live</div>
            <div className="relative h-[160px]"><SystemChart /></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "OS", value: "Ubuntu 22.04 LTS" },
            { label: "Uptime", value: "3d 14h 22m", green: true },
            { label: "PostgreSQL", value: "v14.11" },
            { label: ".NET Runtime", value: ".NET 8.0" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-[#F8FAFC] px-3.5 py-3">
              <div className="text-[11px] text-[#64748B]">{item.label}</div>
              <div className={`text-[13px] font-medium ${item.green ? "text-[#2E7D32]" : "text-[#1E293B]"}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === "company") {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-3 text-[12px] font-medium text-[#64748B]">Organization</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Company name", value: "Cyber Link Communication" },
              { label: "Server IP", value: "160.187.175.62" },
              { label: "Alert email", value: "admin@cyberlink.com" },
              { label: "Log retention (days)", value: "90", type: "number" },
            ].map((f) => (
              <div key={f.label}>
                <div className="mb-1 text-[12px] text-[#64748B]">{f.label}</div>
                <input defaultValue={f.value} type={f.type ?? "text"} className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white">
            <Save size={13} /> Save settings
          </button>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Database backup</div>
          <div className="flex items-center gap-2.5">
            <button type="button" className="flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white">
              <Download size={13} /> Backup now
            </button>
            <span className="text-[12px] text-[#64748B]">Last backup: today 02:00 AM — 1.4 GB</span>
          </div>
        </div>
      </div>
    );
  }

  if (page === "faq") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Frequently asked questions</div>
        {faqs.map((f, i) => (
          <div key={i} className="border-b border-[#E2E8F0] py-2.5 last:border-0">
            <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between text-[13px] font-medium text-[#1E293B]">
              {f.q}
              <ChevronDown size={16} className={openFaq === i ? "rotate-180" : ""} />
            </button>
            {openFaq === i && <p className="mt-1.5 text-[12px] leading-relaxed text-[#64748B]">{f.a}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (page === "servermgr") {
    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <input placeholder="Search servers..." className="w-[200px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]" />
          <button type="button" className="ml-auto flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white">
            <Plus size={13} /> Add Server
          </button>
        </div>
        <DeviceTable />
      </div>
    );
  }

  if (page === "menumgr") {
    return <MenuManagerPanel />;
  }

  if (page === "rolemgr") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Roles</div>
          {["Super Admin", "Operator", "Viewer"].map((role) => (
            <div key={role} className="flex items-center justify-between border-b border-[#E2E8F0] py-2 last:border-0">
              <Tag variant={role === "Super Admin" ? "sa" : role === "Operator" ? "op" : "vw"}>{role}</Tag>
              <Edit size={15} className="cursor-pointer text-[#1565C0]" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Permissions — Super Admin</div>
          {["Dashboard", "Log Stream", "Search Log", "User Manager", "Company Settings", "Role Manager"].map((p) => (
            <div key={p} className="flex items-center justify-between border-b border-[#E2E8F0] py-1.5 last:border-0 text-[12px]">
              <span>{p}</span>
              <Tag variant="ok">Full</Tag>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
