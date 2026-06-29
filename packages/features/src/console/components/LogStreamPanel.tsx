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
  const { tenantId, tenants, setTenantId, isDemo, activeTenant, loading: tenantLoading } = useTenantContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [range, setRange] = useState<TimeRange>("all");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [totalInDb, setTotalInDb] = useState(0);
  const [sessionLogsInDb, setSessionLogsInDb] = useState(0);
  const [syslogsInDb, setSyslogsInDb] = useState(0);
  const [schemaName, setSchemaName] = useState("");
  const [hint, setHint] = useState("");
  const [apiError, setApiError] = useState("");

  const prependLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [entry, ...prev].slice(0, 200);
      onStreamCount?.(next.length);
      return next;
    });
  }, [onStreamCount]);

  const { connected: socketLive, stats: socketStats, error: socketError } = useLogSocket(tenantId ?? undefined, prependLog);

  const loadLogs = useCallback(async () => {
    if (tenantLoading || tenantId == null) return;

    try {
      setApiError("");
      const params = new URLSearchParams({
        tenant_id: String(tenantId),
        limit: "150",
      });

      if (activeTenant?.schema_name) {
        params.set("schema", activeTenant.schema_name);
      }

      if (range !== "all") {
        const hours = range === "1h" ? 1 : range === "24h" ? 24 : 24 * 7;
        const from = new Date(Date.now() - hours * 3600_000).toISOString();
        const to = new Date().toISOString();
        params.set("from", from);
        params.set("to", to);
      }

      if (deviceFilter) params.set("device_id", deviceFilter);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      if (Array.isArray(data.logs)) {
        if (data.logs.length === 0 && (data.total_in_db ?? 0) > 0 && deviceFilter) {
          setDeviceFilter("");
          setHint("Device filter cleared — logs use subscriber NAT IP, not router IP");
          setTotalInDb(data.total_in_db ?? 0);
          setSessionLogsInDb(data.session_logs_in_db ?? 0);
          setSyslogsInDb(data.syslogs_in_db ?? 0);
          return;
        }
        setLogs(data.logs);
        setSource(data.source ?? "");
        setTotalInDb(data.total_in_db ?? 0);
        setSessionLogsInDb(data.session_logs_in_db ?? 0);
        setSyslogsInDb(data.syslogs_in_db ?? 0);
        setSchemaName(data.schema_name ?? activeTenant?.schema_name ?? "");
        setHint(data.hint ?? "");
        onStreamCount?.(data.logs.length);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading, activeTenant?.schema_name, range, deviceFilter, onStreamCount]);

  useEffect(() => {
    if (tenantId == null) return;
    fetch(`/api/devices?tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    if (tenantLoading || tenantId == null) return;
    setLoading(true);
    loadLogs();
    const ms = socketLive ? 15000 : 4000;
    const interval = setInterval(loadLogs, ms);
    return () => clearInterval(interval);
  }, [loadLogs, socketLive, tenantLoading, tenantId]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {tenants.length > 1 && !isDemo && tenantId != null && (
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
            <option key={d.id} value={String(d.id)}>
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
          {logs.length} rows
          {schemaName ? ` · ${schemaName}` : ""}
          {source ? ` · ${source}` : ""}
          {totalInDb > 0 ? ` · DB: ${totalInDb}` : ""}
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
      {tenantLoading || (loading && logs.length === 0 && tenantId == null) ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#1565C0]" size={24} /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-10 text-center text-[13px] text-[#64748B]">
          <p className="font-medium text-[#334155]">No logs in this period</p>
          <p className="mt-1">
            Tenant: <strong>{schemaName || activeTenant?.schema_name || (tenantId != null ? `id ${tenantId}` : "—")}</strong>
            {totalInDb > 0 && (
              <> — DB: <strong>{totalInDb}</strong> rows ({sessionLogsInDb} session_logs + {syslogsInDb} syslogs)</>
            )}
          </p>
          {deviceFilter && totalInDb > 0 && (
            <p className="mt-1 text-[12px] text-[#64748B]">
              Device filter may hide logs — try <strong>All devices</strong>.
            </p>
          )}
          <p className="mt-1">Filter: <strong>{range === "all" ? "All time" : range}</strong></p>
          {apiError && (
            <p className="mt-2 text-[12px] text-[#C62828]">API error: {apiError}</p>
          )}
          {totalInDb > 0 && (
            <p className="mt-2 text-[12px] text-[#1565C0]">
              Database has logs — refresh করুন বা tenant select check করুন।
            </p>
          )}
          {hint && <p className="mt-1 text-[12px] text-[#F57F17]">{hint}</p>}
          {socketLive && (socketStats?.processed ?? 0) > 0 && (
            <p className="mt-2 text-[12px] text-[#2E7D32]">
              Listener processed {socketStats?.processed} logs — wrong tenant select হলে এখানে দেখাবে না।
            </p>
          )}
          {socketError && (
            <p className="mt-2 text-[12px] text-[#F57F17]">Live socket: {socketError}</p>
          )}
        </div>
      ) : (
        <LogsTable logs={logs} />
      )}
    </div>
  );
}
