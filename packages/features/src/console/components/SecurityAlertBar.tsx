"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";

interface SecurityAlert {
  id: number;
  event_type: string;
  severity: "critical" | "warning" | "info";
  ip: string | null;
  email: string | null;
  message: string;
  created_at: string;
}

interface SecurityAlertBarProps {
  tenantId?: number | null;
  /** Compact mode renders only a small badge (for the dashboard tiles). */
  compact?: boolean;
  pollMs?: number;
}

export function SecurityAlertBar({ tenantId, compact = false, pollMs = 15000 }: SecurityAlertBarProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = tenantId != null ? `?tenant_id=${tenantId}&since_minutes=1440&limit=50` : "?since_minutes=1440&limit=50";
      const res = await fetch(`/api/security/alerts${q}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.alerts)) setAlerts(data.alerts);
    } catch {
      // silent — alerts are best-effort
    }
  }, [tenantId]);

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const total = alerts.length;

  if (total === 0) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F5E9] px-2 py-1 text-[11px] font-medium text-[#2E7D32]">
          <ShieldAlert size={12} /> No alerts
        </span>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[#FDECEA] px-2 py-1 text-[11px] font-semibold text-[#C62828]">
        <ShieldAlert size={12} /> {total} alert{total > 1 ? "s" : ""}
        {critical > 0 ? ` · ${critical} critical` : ""}
      </span>
    );
  }

  if (dismissed) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-[#F5C6C0] bg-[#FDECEA]">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E53935] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#C62828]" />
        </span>
        <AlertTriangle size={16} className="text-[#C62828]" />
        <span className="text-[13px] font-semibold text-[#B71C1C]">
          {total} security alert{total > 1 ? "s" : ""} in last 24h
          {critical > 0 ? ` — ${critical} critical` : ""}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto rounded-md px-2 py-1 text-[12px] font-medium text-[#C62828] hover:bg-[#F8D7D2]"
        >
          {expanded ? "Hide" : "View"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-md p-1 text-[#C62828] hover:bg-[#F8D7D2]"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      {expanded && (
        <ul className="max-h-56 divide-y divide-[#F5C6C0] overflow-auto border-t border-[#F5C6C0] bg-white/60">
          {alerts.slice(0, 30).map((a) => (
            <li key={a.id} className="flex items-start gap-2 px-4 py-2 text-[12px]">
              <span
                className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                  a.severity === "critical" ? "bg-[#C62828]" : "bg-[#F57F17]"
                }`}
              />
              <div className="min-w-0">
                <p className="text-[#7F1D1D]">{a.message}</p>
                <p className="text-[11px] text-[#9A6A66]">
                  {new Date(a.created_at).toLocaleString()}
                  {a.ip ? ` · ${a.ip}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
