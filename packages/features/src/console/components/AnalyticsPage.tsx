"use client";

import { useCallback, useEffect, useState } from "react";
import { DynamicChart } from "@isp/features/console/components/DynamicChart";
import { useTenantContext } from "@isp/auth/hooks/useTenantContext";
import type { MetricTimeRange, MetricWithData } from "@isp/core/types/metrics.types";
import { RefreshCw } from "lucide-react";

const RANGES: { id: MetricTimeRange; label: string }[] = [
  { id: "1h", label: "1 hour" },
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

const sizeClass = {
  small: "lg:col-span-1",
  medium: "lg:col-span-1",
  large: "lg:col-span-2",
};

export function AnalyticsPage() {
  const { tenantId, tenants, setTenantId, isDemo, loading: tenantLoading } = useTenantContext();
  const [metrics, setMetrics] = useState<MetricWithData[]>([]);
  const [range, setRange] = useState<MetricTimeRange>("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMetrics = useCallback(async () => {
    if (tenantLoading || tenantId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/metrics?tenant_id=${tenantId}&tenantId=${tenantId}&range=${range}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? data.detail ?? "Failed to load metrics");
        setMetrics([]);
        return;
      }
      setMetrics(Array.isArray(data) ? data : data.metrics ?? []);
    } catch {
      setError("Could not load analytics");
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading, range, refreshKey]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const minRefresh = Math.max(
    10,
    metrics.reduce((min, m) => Math.min(min, m.refresh_interval || 5), 10)
  );

  useEffect(() => {
    const timer = setInterval(() => setRefreshKey((k) => k + 1), minRefresh * 1000);
    return () => clearInterval(timer);
  }, [minRefresh]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div>
          <div className="mb-1 text-[11px] font-medium text-[#64748B]">Tenant</div>
          {tenants.length > 1 && !isDemo ? (
            <select
              value={tenantId ?? ""}
              onChange={(e) => setTenantId(Number(e.target.value))}
              className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px]"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.admin_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] text-[#64748B]">
              {tenants[0]?.admin_name ?? "Demo Sandbox"}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-[#64748B]">Time range</div>
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  range === r.id
                    ? "bg-[#1976D2] text-white"
                    : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="ml-auto flex items-center gap-1 rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px] text-[#64748B] hover:bg-[#F8FAFC]"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {loading && (
        <p className="py-12 text-center text-sm text-[#64748B]">Loading analytics charts...</p>
      )}

      {error && (
        <div className="rounded-md bg-[#FFF8E1] px-3 py-2 text-[12px] text-[#E65100]">{error}</div>
      )}

      {!loading && !error && metrics.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E2E8F0] py-16 text-center text-sm text-[#64748B]">
          No visible metrics configured. Super Admin can enable charts at /admin/metrics
        </div>
      )}

      {!loading && metrics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.id} className={sizeClass[metric.chart_size] ?? "lg:col-span-1"}>
              <DynamicChart
                title={metric.display_name}
                type={metric.chart_type}
                data={metric.data}
                color={metric.color}
                unit={metric.unit}
                size={metric.chart_size}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
