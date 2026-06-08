"use client";

import { useCallback, useEffect, useState } from "react";
import type { Device, LogEntry } from "@/types";
import { LogsTable } from "@/components/dashboard/LogsTable";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Loader2 } from "lucide-react";

interface LogStreamPanelProps {
  onStreamCount?: (count: number) => void;
}

export function LogStreamPanel({ onStreamCount }: LogStreamPanelProps) {
  const { tenantId, tenants, setTenantId } = useTenantContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");

  const loadLogs = useCallback(async () => {
    try {
      const from = `${date}T00:00:00.000Z`;
      const to = `${date}T23:59:59.999Z`;
      const params = new URLSearchParams({
        tenant_id: String(tenantId),
        limit: "150",
        from,
        to,
      });
      if (deviceFilter) params.set("user", deviceFilter);

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
  }, [tenantId, date, deviceFilter, onStreamCount]);

  useEffect(() => {
    fetch(`/api/devices?tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    setLoading(true);
    loadLogs();
    const interval = setInterval(loadLogs, 4000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {tenants.length > 1 && (
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
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-[140px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
        />
        <div className="flex items-center gap-1.5 rounded-md bg-[#E8F5E9] px-2.5 py-1 text-[12px] font-medium text-[#2E7D32]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#43A047] pulse-dot" />
          {loading ? "Loading..." : "Live"}
        </div>
        <span className="ml-auto text-[12px] text-[#64748B]">
          {logs.length} rows {source ? `· ${source}` : ""}
        </span>
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
      ) : (
        <LogsTable logs={logs} />
      )}
    </div>
  );
}
