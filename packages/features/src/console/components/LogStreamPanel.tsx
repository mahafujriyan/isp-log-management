"use client";

import { useCallback, useEffect, useState } from "react";
import type { Device, LogEntry } from "@isp/core/types";
import { LogsTable } from "@isp/features/console/components/LogsTable";
import { useLogSocket } from "@isp/features/logs";
import { useTenantContext } from "@isp/auth/hooks/useTenantContext";
import { Loader2 } from "lucide-react";

interface LogStreamPanelProps {
  onStreamCount?: (count: number) => void;
}

type TimeRange = "1h" | "24h" | "7d" | "all";

export function LogStreamPanel({ onStreamCount }: LogStreamPanelProps) {
  const { tenantId, tenants, setTenantId, isDemo } = useTenantContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [range, setRange] = useState<TimeRange>("7d");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");

  const prependLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [entry, ...prev].slice(0, 200);
      onStreamCount?.(next.length);
      return next;
    });
  }, [onStreamCount]);

  const { connected: socketLive, stats: socketStats, error: socketError } = useLogSocket(tenantId, prependLog);

  const loadLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        tenant_id: String(tenantId),
        limit: "150",
      });

      if (range !== "all") {
        const hours = range === "1h" ? 1 : range === "24h" ? 24 : 24 * 7;
        const from = new Date(Date.now() - hours * 3600_000).toISOString();
        const to = new Date().toISOString();
        params.set("from", from);
        params.set("to", to);
      }

      if (deviceFilter) params.set("nat_ip", deviceFilter);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setSource(data.source ?? "");
        onStreamCount?.(data.logs.length);
      }
    } catch {
      /* keep previous logs */
    } finally {
      setLoading(false);
    }
  }, [tenantId, range, deviceFilter, onStreamCount]);

  useEffect(() => {
    fetch(`/api/devices?tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    setLoading(true);
    loadLogs();
    const ms = socketLive ? 15000 : 4000;
    const interval = setInterval(loadLogs, ms);
    return () => clearInterval(interval);
  }, [loadLogs, socketLive]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {tenants.length > 1 && !isDemo && (
          <select
            value={tenantId}
            onChange={(e) => setTenantId(Number(e.target.value))}
            className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.schema_name}</option>
            ))}
          </select>
        )}
        <select
          value={deviceFilter}
          onChange={(e) => setDeviceFilter(e.target.value)}
          className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
        >
          <option value="">All devices</option>
          {devices.map((d) => (
            <option key={d.id} value={d.nat_ip}>
              {d.id} — {d.name} ({d.config})
            </option>
          ))}
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as TimeRange)}
          className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
        >
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All time</option>
        </select>
        <div
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium ${socketLive ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFF8E1] text-[#F57F17]"}`}
          title={socketError ?? (socketLive ? "Real-time via Socket.IO" : "Syslog listener not running")}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full pulse-dot ${socketLive ? "bg-[#43A047]" : "bg-[#FFA000]"}`} />
          {socketLive ? "Live" : loading ? "Loading..." : "Polling (4s)"}
        </div>
        <span className="ml-auto text-[12px] text-[#64748B]">
          {logs.length} rows {source ? `· ${source}` : ""}
          {socketStats ? ` · ingested ${socketStats.processed}` : ""}
        </span>
        <button
          type="button"
          onClick={loadLogs}
          className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px] text-[#64748B] hover:bg-[#F8FAFC]"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => { setLogs([]); onStreamCount?.(0); }}
          className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px] text-[#64748B] hover:bg-[#F8FAFC]"
        >
          Clear
        </button>
      </div>
      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#1565C0]" size={24} /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-10 text-center text-[13px] text-[#64748B]">
          <p className="font-medium text-[#334155]">No logs in this period</p>
          <p className="mt-1">Try <strong>Last 7 days</strong> or <strong>All time</strong>. MikroTik must send syslog to this server.</p>
          {socketLive && (socketStats?.processed ?? 0) === 0 && (
            <p className="mt-2 text-[12px] text-[#F57F17]">Socket is live but 0 logs ingested — send a test via API or configure MikroTik syslog.</p>
          )}
        </div>
      ) : (
        <LogsTable logs={logs} />
      )}
    </div>
  );
}
