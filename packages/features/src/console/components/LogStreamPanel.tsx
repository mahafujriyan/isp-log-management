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

function mergeLatestLogs(primary: LogEntry[], fallback: LogEntry[], limit = 200): LogEntry[] {
  const merged = new Map<string, LogEntry>();
  const add = (log: LogEntry) => {
    const key = `${log.time}|${log.user_ip}|${log.visited_ip}|${log.port}|${log.user_port ?? 0}`;
    if (!merged.has(key)) merged.set(key, log);
  };
  for (const l of primary) add(l);
  for (const l of fallback) add(l);
  return [...merged.values()]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit);
}

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
  const [routerConnected, setRouterConnected] = useState<boolean | null>(null);
  const connectedDevices = devices.filter((d) => d.status === "receiving");

  const prependLog = useCallback((entry: LogEntry) => {
    setRouterConnected(true);
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
        require_connected: "false",
      });
      if (!totalInDb) params.set("include_db_counts", "true");

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
        setApiError(data.detail ?? data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      if (Array.isArray(data.logs)) {
        const shouldMerge = !deviceFilter && range === "all";
        setLogs((prev) => (shouldMerge ? mergeLatestLogs(data.logs, prev, 200) : data.logs));
        setSource(data.source ?? "");
        setTotalInDb(data.total_in_db ?? 0);
        setSessionLogsInDb(data.session_logs_in_db ?? 0);
        setSyslogsInDb(data.syslogs_in_db ?? 0);
        setSchemaName(data.schema_name ?? activeTenant?.schema_name ?? "");
        setHint(data.hint ?? "");
        setRouterConnected(socketLive ? true : (data.router_connected ?? null));
        onStreamCount?.(data.logs.length);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading, activeTenant?.schema_name, range, deviceFilter, onStreamCount, socketLive]);

  useEffect(() => {
    if (tenantId == null) return;
    const load = () => {
      fetch(`/api/devices?tenant_id=${tenantId}`)
        .then((r) => r.json())
        .then((d) => setDevices(d.devices ?? []))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
  }, [tenantId]);

  useEffect(() => {
    if (tenantLoading || tenantId == null) return;
    setLoading(true);
    loadLogs();
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, [loadLogs, tenantLoading, tenantId]);

  useEffect(() => {
    if (socketLive) setRouterConnected(true);
  }, [socketLive]);

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
          <option value="">All connected routers</option>
          {connectedDevices.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name} ({d.config}) — {d.ip}
            </option>
          ))}
          {connectedDevices.length === 0 && devices.length > 0 && (
            <option disabled>No router connected</option>
          )}
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
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium ${
            routerConnected ? "bg-[#E8F5E9] text-[#2E7D32]" : routerConnected === false ? "bg-[#FFEBEE] text-[#C62828]" : "bg-[#F1F5F9] text-[#64748B]"
          }`}
          title="MikroTik must send syslog within 30 minutes"
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${routerConnected ? "bg-[#43A047]" : routerConnected === false ? "bg-[#E53935]" : "bg-[#94A3B8]"}`} />
          {routerConnected ? "Router OK" : routerConnected === false ? "Router offline" : "Router…"}
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium ${socketLive ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFF8E1] text-[#F57F17]"}`}
          title={socketError ?? (socketLive ? "Real-time via Socket.IO" : "Syslog listener not running")}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full pulse-dot ${socketLive ? "bg-[#43A047]" : "bg-[#FFA000]"}`} />
          {socketLive ? "Live" : loading ? "Loading..." : "Polling (2s)"}
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
          <p className="font-medium text-[#334155]">
            {routerConnected === false
              ? "Router offline — MikroTik থেকে syslog আসছে না"
              : "No logs in this period"}
          </p>
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
          {routerConnected === false && (
            <div className="mt-3 rounded-lg bg-[#FFF8E1] px-3 py-2 text-left text-[12px] text-[#5D4037]">
              <p className="font-medium">MikroTik setup (একবার করলেই হবে):</p>
              <ol className="mt-1 list-decimal pl-4 space-y-0.5">
                <li>Device IP = MikroTik Winbox IP (ভুল IP = সবসময় Offline)</li>
                <li>MikroTik syslog target: <strong>160.187.175.30:514</strong> (UDP)</li>
                <li>VPS SSH: <code>pm2 status</code> → isp-syslog-listener online</li>
                <li>Filter <strong>All time</strong> দিন — DB-তে পুরনো log থাকলে দেখাবে</li>
              </ol>
            </div>
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
