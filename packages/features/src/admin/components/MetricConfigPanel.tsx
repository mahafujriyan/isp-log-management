"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminMetricRow } from "@isp/core/types/metrics.types";
import { AdminLayout } from "@isp/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@isp/features/admin/components/AdminPortalLayout";
import { useRole } from "@isp/auth/hooks/useRole";
import { BarChart3, Eye, EyeOff, LayoutDashboard } from "lucide-react";

export function MetricConfigPanel({ embedded = false }: { embedded?: boolean }) {
  const { session } = useRole();
  const [metrics, setMetrics] = useState<AdminMetricRow[]>([]);
  const [tenantId, setTenantId] = useState(1);
  const [tenants, setTenants] = useState<Array<{ id: number; admin_name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/metrics?tenantId=${tenantId}`);
    const data = await res.json();
    if (Array.isArray(data)) setMetrics(data);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTenants(data.map((t: { id: number; admin_name: string }) => ({ id: t.id, admin_name: t.admin_name })));
          if (data[0]) setTenantId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  async function toggleVisibility(metricId: number, currentlyVisible: boolean) {
    await fetch(`/api/admin/metrics/${metricId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, isVisible: !currentlyVisible }),
    });
    await loadMetrics();
  }

  const content = (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!embedded && (
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
          >
            ← Tenants
          </Link>
        )}
        <Link
          href="/operator/reports"
          className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300"
        >
          <LayoutDashboard size={14} />
          View Analytics Page
        </Link>
        <select
          value={tenantId}
          onChange={(e) => setTenantId(Number(e.target.value))}
          className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.admin_name}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Toggle visibility per tenant. Charts render on the sidebar <strong className="text-amber-400">Analytics</strong> page using each metric&apos;s chart type (line, bar, pie).
      </p>

      {loading && <p className="text-sm text-slate-500">Loading metrics...</p>}

      <div className="grid gap-3">
        {metrics.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111827]/60 p-4"
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${m.color}22`, color: m.color }}
              >
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-white">{m.display_name}</h3>
                <p className="text-xs text-slate-400">
                  {m.chart_type} chart · {m.name} · refresh every {m.refresh_interval}s
                </p>
                {m.description && (
                  <p className="mt-1 text-[11px] text-slate-500">{m.description}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleVisibility(m.id, m.is_visible)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${
                m.is_visible
                  ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                  : "bg-white/5 text-slate-400 ring-1 ring-white/10"
              }`}
            >
              {m.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
              {m.is_visible ? "Visible on Analytics" : "Hidden"}
            </button>
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return (
      <>
        <AdminPageHeader
          title="Metric Configuration"
          subtitle="Control which MikroTik analytics appear on each tenant dashboard"
        />
        {content}
      </>
    );
  }

  return (
    <AdminLayout
      title="Metric Configuration"
      subtitle="Control which MikroTik analytics appear on each tenant dashboard"
      userName={session?.user?.username ?? session?.user?.name ?? undefined}
    >
      {content}
    </AdminLayout>
  );
}
