import { db } from "@isp/core/lib/database";
import type {
  AdminMetricRow,
  MetricChartPoint,
  MetricTimeRange,
  MetricWithData,
  MikroTikLog,
  ParsedMetrics,
} from "@isp/core/types/metrics.types";
import { aggregateMetrics, logEntryToMikroTikLog } from "@isp/core/utils/mikrotik-parser.utils";
import type { LogEntry } from "@isp/core/types";
import { getTenantById } from "@isp/core/services/tenant.service";
import { getTenantSyslogs } from "@isp/core/services/syslog.service";

const RANGE_INTERVAL: Record<MetricTimeRange, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

const METRIC_VALUE_KEYS: Record<string, keyof ParsedMetrics> = {
  bandwidth: "totalBandwidth",
  active_users: "activeUsers",
  active_connections: "activeConnections",
};

function getInterval(range: string): MetricTimeRange {
  if (range === "1h" || range === "24h" || range === "7d" || range === "30d") return range;
  return "24h";
}

export async function ensureTenantMetricSettings(tenantId: number): Promise<void> {
  await db.query(
    `INSERT INTO public.tenant_metric_settings (tenant_id, metric_id, is_visible, position, chart_size, refresh_interval)
     SELECT $1, m.id, TRUE, m.id - 1, 'medium', 5
     FROM public.metrics m
     WHERE m.is_active = TRUE
     ON CONFLICT (tenant_id, metric_id) DO NOTHING`,
    [tenantId]
  );
}

export async function getVisibleMetricsWithData(
  tenantId: number,
  rangeParam = "24h"
): Promise<MetricWithData[]> {
  const range = getInterval(rangeParam);
  const interval = RANGE_INTERVAL[range];

  await ensureTenantMetricSettings(tenantId);

  const rows = await db.getMany<MetricWithData & { metric_name: string }>(
    `SELECT m.id, m.name, m.display_name, m.description, m.unit, m.chart_type, m.color, m.is_active,
            tms.is_visible, tms.position, tms.chart_size, tms.refresh_interval
     FROM public.metrics m
     JOIN public.tenant_metric_settings tms ON m.id = tms.metric_id
     WHERE tms.tenant_id = $1 AND tms.is_visible = TRUE AND m.is_active = TRUE
     ORDER BY tms.position ASC, m.id ASC`,
    [tenantId]
  );

  const tenant = await getTenantById(tenantId);
  const syslogLogs = tenant
    ? await getTenantSyslogs(tenant.schema_name, { limit: 500 })
    : [];

  const mikrotikLogs = syslogLogs.map((l) => logEntryToMikroTikLog(l));
  const aggregated = aggregateMetrics(mikrotikLogs);

  return Promise.all(
    rows.map(async (row) => {
      const data = await resolveChartData(
        tenantId,
        row.name,
        row.chart_type,
        interval,
        aggregated,
        mikrotikLogs
      );
      return {
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description,
        unit: row.unit,
        chart_type: row.chart_type as MetricWithData["chart_type"],
        color: row.color,
        is_active: row.is_active,
        is_visible: row.is_visible,
        position: row.position,
        chart_size: row.chart_size as MetricWithData["chart_size"],
        refresh_interval: row.refresh_interval,
        data,
      };
    })
  );
}

async function resolveChartData(
  tenantId: number,
  metricName: string,
  chartType: string,
  interval: string,
  aggregated: ParsedMetrics,
  logs: MikroTikLog[]
): Promise<MetricChartPoint[]> {
  if (metricName === "protocol_dist") {
    return Object.entries(aggregated.protocolDistribution).map(([name, value]) => ({
      name,
      value,
    }));
  }

  if (metricName === "top_ips") {
    return aggregated.topIps.map(({ ip, bandwidth }) => ({
      name: ip,
      value: bandwidth,
    }));
  }

  const series = await db.getMany<{ value: string; recorded_at: string }>(
    `SELECT value::text, recorded_at::text
     FROM public.metric_data
     WHERE tenant_id = $1
       AND metric_id = (SELECT id FROM public.metrics WHERE name = $2)
       AND recorded_at > NOW() - $3::interval
     ORDER BY recorded_at ASC`,
    [tenantId, metricName, interval]
  );

  if (series.length > 0) {
    return series.map((p) => ({
      name: new Date(p.recorded_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: Number(p.value),
      recorded_at: p.recorded_at,
    }));
  }

  return buildFallbackSeries(metricName, chartType, aggregated, logs);
}

function buildFallbackSeries(
  metricName: string,
  chartType: string,
  aggregated: ParsedMetrics,
  logs: MikroTikLog[]
): MetricChartPoint[] {
  if (metricName === "bandwidth") {
    const buckets = bucketLogsByHour(logs, (batch) =>
      batch.reduce((s, l) => s + l.bandwidth, 0)
    );
    return buckets.length > 0 ? buckets : [{ name: "Now", value: aggregated.totalBandwidth }];
  }

  if (metricName === "active_users") {
    const buckets = bucketLogsByHour(logs, (batch) => new Set(batch.map((l) => l.pppoeUser)).size);
    return buckets.length > 0 ? buckets : [{ name: "Now", value: aggregated.activeUsers }];
  }

  if (metricName === "active_connections") {
    const buckets = bucketLogsByHour(logs, (batch) => batch.length);
    return buckets.length > 0 ? buckets : [{ name: "Now", value: aggregated.activeConnections }];
  }

  if (metricName === "error_rate") {
    return [{ name: "Now", value: logs.length ? 0.5 : 0 }];
  }

  if (chartType === "pie" || chartType === "bar") {
    return [{ name: metricName, value: 0 }];
  }

  return [{ name: "Now", value: 0 }];
}

function bucketLogsByHour(
  logs: MikroTikLog[],
  reducer: (batch: MikroTikLog[]) => number
): MetricChartPoint[] {
  const map = new Map<string, MikroTikLog[]>();
  logs.forEach((log) => {
    const key = log.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const batch = map.get(key) ?? [];
    batch.push(log);
    map.set(key, batch);
  });
  return [...map.entries()].map(([name, batch]) => ({ name, value: reducer(batch) }));
}

export async function listAdminMetrics(tenantId: number): Promise<AdminMetricRow[]> {
  await ensureTenantMetricSettings(tenantId);

  return db.getMany<AdminMetricRow>(
    `SELECT m.id, m.name, m.display_name, m.description, m.unit, m.chart_type, m.color, m.is_active,
            COALESCE(tms.is_visible, FALSE) AS is_visible,
            COALESCE(tms.position, 0) AS position,
            COALESCE(tms.chart_size, 'medium') AS chart_size,
            COALESCE(tms.refresh_interval, 5) AS refresh_interval
     FROM public.metrics m
     LEFT JOIN public.tenant_metric_settings tms
       ON m.id = tms.metric_id AND tms.tenant_id = $1
     ORDER BY COALESCE(tms.position, 999), m.id`,
    [tenantId]
  );
}

export async function toggleMetricVisibility(
  tenantId: number,
  metricId: number,
  isVisible: boolean
): Promise<void> {
  await ensureTenantMetricSettings(tenantId);
  await db.query(
    `UPDATE public.tenant_metric_settings
     SET is_visible = $1
     WHERE tenant_id = $2 AND metric_id = $3`,
    [isVisible, tenantId, metricId]
  );
}

export async function updateMetricSetting(
  tenantId: number,
  metricId: number,
  updates: { position?: number; chart_size?: string; refresh_interval?: number }
): Promise<void> {
  await ensureTenantMetricSettings(tenantId);
  await db.query(
    `UPDATE public.tenant_metric_settings
     SET position = COALESCE($1, position),
         chart_size = COALESCE($2, chart_size),
         refresh_interval = COALESCE($3, refresh_interval)
     WHERE tenant_id = $4 AND metric_id = $5`,
    [updates.position ?? null, updates.chart_size ?? null, updates.refresh_interval ?? null, tenantId, metricId]
  );
}

export async function recordMetricsFromLogs(
  tenantId: number,
  logs: LogEntry[]
): Promise<void> {
  if (logs.length === 0) return;

  await ensureTenantMetricSettings(tenantId);
  const mikrotikLogs = logs.map((l) => logEntryToMikroTikLog(l));
  const aggregated = aggregateMetrics(mikrotikLogs);

  const metricRows = await db.getMany<{ id: number; name: string }>(
    "SELECT id, name FROM public.metrics WHERE is_active = TRUE"
  );

  for (const metric of metricRows) {
    let value: number | null = null;

    if (metric.name === "protocol_dist" || metric.name === "top_ips") continue;

    if (metric.name === "error_rate") {
      value = 0;
    } else if (METRIC_VALUE_KEYS[metric.name]) {
      value = aggregated[METRIC_VALUE_KEYS[metric.name]] as number;
    }

    if (value === null) continue;

    await db.query(
      `INSERT INTO public.metric_data (tenant_id, metric_id, value) VALUES ($1, $2, $3)`,
      [tenantId, metric.id, value]
    );
  }
}

export function getMetricIntervalLabel(range: string): string {
  return RANGE_INTERVAL[getInterval(range)];
}
