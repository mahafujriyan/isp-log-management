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
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

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

const DEFAULT_METRICS: Array<{
  name: string;
  display_name: string;
  unit: string;
  chart_type: "line" | "bar" | "pie";
  color: string;
  description: string;
}> = [
  {
    name: "bandwidth",
    display_name: "Total Bandwidth",
    unit: "bps",
    chart_type: "line",
    color: "#0EA5E9",
    description: "Total observed traffic in selected interval",
  },
  {
    name: "active_users",
    display_name: "Active PPPoE Users",
    unit: "users",
    chart_type: "line",
    color: "#10B981",
    description: "Currently active PPPoE users",
  },
  {
    name: "active_connections",
    display_name: "Active Connections",
    unit: "connections",
    chart_type: "bar",
    color: "#F59E0B",
    description: "Number of NAT connections in selected interval",
  },
  {
    name: "protocol_dist",
    display_name: "Protocol Usage",
    unit: "count",
    chart_type: "pie",
    color: "#8B5CF6",
    description: "Protocol distribution by connection count",
  },
  {
    name: "top_ips",
    display_name: "Top Destination IP",
    unit: "count",
    chart_type: "bar",
    color: "#EC4899",
    description: "Most visited destination IPs",
  },
  {
    name: "error_rate",
    display_name: "Error Rate",
    unit: "%",
    chart_type: "line",
    color: "#EF4444",
    description: "Estimated error rate",
  },
];

function getInterval(range: string): MetricTimeRange {
  if (range === "1h" || range === "24h" || range === "7d" || range === "30d") return range;
  return "24h";
}

async function sessionLogsTableExists(schemaName: string): Promise<boolean> {
  const schema = assertValidTenantSchema(schemaName);
  const row = await db.getOne<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'session_logs'
     ) AS exists`,
    [schema]
  );
  return row?.exists ?? false;
}

async function ensureDefaultMetricDefinitions(): Promise<void> {
  for (const metric of DEFAULT_METRICS) {
    await db.query(
      `INSERT INTO public.metrics
         (name, display_name, description, unit, chart_type, color, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (name) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         description = EXCLUDED.description,
         unit = EXCLUDED.unit,
         chart_type = EXCLUDED.chart_type,
         color = EXCLUDED.color,
         is_active = TRUE`,
      [
        metric.name,
        metric.display_name,
        metric.description,
        metric.unit,
        metric.chart_type,
        metric.color,
      ]
    );
  }
}

/** Fast indexed read — avoids merging syslogs + full table scans. */
async function fetchMetricLogs(schemaName: string, interval: string): Promise<MikroTikLog[]> {
  const schema = assertValidTenantSchema(schemaName);

  const rows = await db.getMany<{
    log_time: string;
    pppoe_user: string | null;
    user_ip: string | null;
    nat_ip: string | null;
    visited_ip: string | null;
    protocol: string | null;
    user_port: number | null;
    visited_port: number | null;
    raw_message: string | null;
  }>(
    `SELECT log_time::text, pppoe_user, host(user_ip) AS user_ip, host(nat_ip) AS nat_ip,
            host(visited_ip) AS visited_ip, protocol, user_port, visited_port, raw_message
     FROM "${schema}".session_logs
     WHERE log_time > NOW() - $1::interval
     ORDER BY log_time DESC
     LIMIT 2000`,
    [interval]
  );

  return rows.map((row) =>
    logEntryToMikroTikLog({
      time: row.log_time,
      pppoe_user: row.pppoe_user ?? "",
      user_ip: row.user_ip ?? "",
      nat_ip: row.nat_ip ?? "",
      visited_ip: row.visited_ip ?? "",
      port: row.visited_port ?? 0,
      user_port: row.user_port ?? undefined,
      nat_port: undefined,
      protocol: row.protocol ?? undefined,
      raw_message: row.raw_message ?? undefined,
      mac: "",
    })
  );
}

async function fetchProtocolDistribution(
  schemaName: string,
  interval: string
): Promise<MetricChartPoint[]> {
  const schema = assertValidTenantSchema(schemaName);

  const rows = await db.getMany<{ name: string; value: string }>(
    `SELECT COALESCE(NULLIF(UPPER(protocol), ''), 'UNKNOWN') AS name, COUNT(*)::text AS value
     FROM "${schema}".session_logs
     WHERE log_time > NOW() - $1::interval
     GROUP BY 1
     ORDER BY COUNT(*) DESC
     LIMIT 8`,
    [interval]
  );
  return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
}

async function fetchTopVisitedIps(
  schemaName: string,
  interval: string
): Promise<MetricChartPoint[]> {
  const schema = assertValidTenantSchema(schemaName);

  const rows = await db.getMany<{ name: string; value: string }>(
    `SELECT host(visited_ip) AS name, COUNT(*)::text AS value
     FROM "${schema}".session_logs
     WHERE log_time > NOW() - $1::interval AND visited_ip IS NOT NULL
     GROUP BY visited_ip
     ORDER BY COUNT(*) DESC
     LIMIT 10`,
    [interval]
  );
  return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
}

async function fetchActivePppoeUsers(schemaName: string): Promise<number> {
  const schema = assertValidTenantSchema(schemaName);
  const row = await db.getOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "${schema}".pppoe_users WHERE status = 'active'`
  ).catch(() => null);
  return Number(row?.count ?? 0);
}

export async function ensureTenantMetricSettings(tenantId: number): Promise<void> {
  await ensureDefaultMetricDefinitions();
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
  if (!tenant) return [];

  const hasSessionLogs = await sessionLogsTableExists(tenant.schema_name);

  const [metricLogs, protocolDist, topIps, activePppoe] = await Promise.all([
    hasSessionLogs ? fetchMetricLogs(tenant.schema_name, interval) : Promise.resolve([]),
    hasSessionLogs ? fetchProtocolDistribution(tenant.schema_name, interval) : Promise.resolve([]),
    hasSessionLogs ? fetchTopVisitedIps(tenant.schema_name, interval) : Promise.resolve([]),
    fetchActivePppoeUsers(tenant.schema_name),
  ]);

  const aggregated = aggregateMetrics(metricLogs);
  if (activePppoe > 0) aggregated.activeUsers = activePppoe;

  return Promise.all(
    rows.map(async (row) => {
      const data = await resolveChartData(
        tenantId,
        row.name,
        row.chart_type,
        interval,
        aggregated,
        metricLogs,
        protocolDist,
        topIps
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
  logs: MikroTikLog[],
  protocolDist: MetricChartPoint[],
  topIps: MetricChartPoint[]
): Promise<MetricChartPoint[]> {
  if (metricName === "protocol_dist") {
    if (protocolDist.length > 0) return protocolDist;
    return Object.entries(aggregated.protocolDistribution).map(([name, value]) => ({
      name,
      value,
    }));
  }

  if (metricName === "top_ips") {
    if (topIps.length > 0) return topIps;
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
