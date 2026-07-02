import { db } from "@isp/core/lib/database";
import type { IngestLogsInput, LogEntry, SyslogEntry } from "@isp/core/types";
import {
  getActiveTenantSchemas,
  getTenantById,
  getTenantBySchema,
  syslogToLogEntry,
} from "@isp/core/services/tenant.service";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";
import { enrichLogEntryForDisplay } from "@isp/core/utils/log-display.utils";

interface SyslogQueryOptions {
  limit?: number;
  from?: string;
  to?: string;
  user?: string;
  mac?: string;
  nat_ip?: string;
  router_id?: number;
  router_ids?: number[];
  require_connected?: boolean;
}

function buildSessionLogsSelect(schema: string, options: SyslogQueryOptions): { sql: string; params: unknown[] } {
  const schemaSafe = assertValidTenantSchema(schema);
  const params: unknown[] = [];
  let sql = `
    SELECT id, log_time AS received_at, pppoe_user, mac_address,
           host(user_ip) AS user_ip, user_port,
           host(nat_ip) AS nat_ip, nat_port,
           host(visited_ip) AS visited_ip, visited_port,
           protocol, NULL::char(2) AS country_code, NULL::varchar(64) AS city, raw_message
    FROM "${schemaSafe}".session_logs
    WHERE 1=1
  `;

  if (options.from) {
    params.push(options.from);
    sql += ` AND log_time >= $${params.length}::timestamptz`;
  }
  if (options.to) {
    params.push(options.to);
    sql += ` AND log_time <= $${params.length}::timestamptz`;
  }
  if (options.user) {
    params.push(`%${options.user}%`);
    sql += ` AND (LOWER(pppoe_user) LIKE LOWER($${params.length}) OR host(user_ip) LIKE $${params.length} OR host(visited_ip) LIKE $${params.length} OR host(nat_ip) LIKE $${params.length})`;
  }
  if (options.nat_ip) {
    params.push(options.nat_ip);
    sql += ` AND host(nat_ip) = $${params.length}`;
  }
  if (options.router_id) {
    params.push(options.router_id);
    sql += ` AND router_id = $${params.length}`;
  }
  if (options.router_ids && options.router_ids.length > 0) {
    params.push(options.router_ids);
    sql += ` AND router_id = ANY($${params.length}::int[])`;
  }
  if (options.mac) {
    params.push(`%${options.mac.replace(/[:-]/g, "")}%`);
    sql += ` AND REPLACE(REPLACE(UPPER(mac_address), ':', ''), '-', '') LIKE UPPER($${params.length})`;
  }

  params.push(options.limit ?? 100);
  sql += ` ORDER BY log_time DESC LIMIT $${params.length}`;

  return { sql, params };
}

function buildSyslogSelect(schema: string, options: SyslogQueryOptions): { sql: string; params: unknown[] } {
  const schemaSafe = assertValidTenantSchema(schema);
  const params: unknown[] = [];
  let sql = `
    SELECT id, received_at, pppoe_user, mac_address,
           host(user_ip) AS user_ip, user_port,
           host(nat_ip) AS nat_ip, nat_port,
           host(visited_ip) AS visited_ip, visited_port,
           protocol, country_code, city, raw_message
    FROM "${schemaSafe}".syslogs
    WHERE 1=1
  `;

  if (options.from) {
    params.push(options.from);
    sql += ` AND received_at >= $${params.length}::timestamptz`;
  }
  if (options.to) {
    params.push(options.to);
    sql += ` AND received_at <= $${params.length}::timestamptz`;
  }
  if (options.user) {
    params.push(`%${options.user}%`);
    sql += ` AND (LOWER(pppoe_user) LIKE LOWER($${params.length}) OR host(user_ip) LIKE $${params.length} OR host(visited_ip) LIKE $${params.length} OR host(nat_ip) LIKE $${params.length})`;
  }
  if (options.nat_ip) {
    params.push(options.nat_ip);
    sql += ` AND host(nat_ip) = $${params.length}`;
  }
  if (options.mac) {
    params.push(`%${options.mac.replace(/[:-]/g, "")}%`);
    sql += ` AND REPLACE(REPLACE(UPPER(mac_address), ':', ''), '-', '') LIKE UPPER($${params.length})`;
  }

  params.push(options.limit ?? 100);
  sql += ` ORDER BY received_at DESC LIMIT $${params.length}`;

  return { sql, params };
}

const isIpLikeStr = (value?: string | null): boolean =>
  !!value?.trim() && /^\d{1,3}(\.\d{1,3}){3}$/.test(value.trim());

/**
 * Enrich display logs from the latest PPPoE session, matched by private IP.
 * Always prefers the real customer username + MAC over NAT-log values
 * (which carry the private IP as user and the router MAC).
 */
async function enrichLogsFromPppoeTable(schemaName: string, logs: LogEntry[]): Promise<LogEntry[]> {
  if (logs.length === 0) return logs;

  const userIps = logs.map((log) => log.user_ip).filter((ip): ip is string => !!ip);
  if (userIps.length === 0) return logs;

  const { lookupPppoeByPrivateIps } = await import("@isp/core/services/pppoe-session.service");
  const byIp = await lookupPppoeByPrivateIps(schemaName, userIps).catch(() => new Map());

  if (byIp.size === 0) return logs;

  return logs.map((log) => {
    const match = byIp.get(log.user_ip);
    if (!match) return log;

    const currentUserOk =
      log.pppoe_user && log.pppoe_user !== "Unknown" && !isIpLikeStr(log.pppoe_user);

    return {
      ...log,
      pppoe_user: currentUserOk ? log.pppoe_user : match.username,
      mac: match.mac_address || log.mac,
      router_name: match.router_name ?? log.router_name ?? null,
      session_status: match.status ?? log.session_status ?? null,
      session_last_seen: match.last_seen_at ?? log.session_last_seen ?? null,
    };
  });
}

export async function getTenantSyslogs(
  schemaName: string,
  options: SyslogQueryOptions = {}
): Promise<LogEntry[]> {
  const schemaSafe = assertValidTenantSchema(schemaName);
  const limit = options.limit ?? 100;
  const queryOptions = { ...options };

  try {
    const sessionTable = await db.getOne<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'session_logs'
       ) AS exists`,
      [schemaSafe]
    );

    const merged: LogEntry[] = [];
    const seen = new Set<string>();

    const addRows = (rows: SyslogEntry[]) => {
      for (const row of rows) {
        const entry = syslogToLogEntry(row);
        const key = `${entry.time}|${entry.pppoe_user}|${entry.user_ip}|${entry.visited_ip}|${entry.port}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(entry);
      }
    };

    if (sessionTable?.exists) {
      const { sql, params } = buildSessionLogsSelect(schemaName, { ...queryOptions, limit });
      addRows(await db.getMany<SyslogEntry>(sql, params));
      if (merged.length >= limit) {
        const baseLogs = merged
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, limit)
          .map(enrichLogEntryForDisplay);
        return await enrichLogsFromPppoeTable(schemaName, baseLogs);
      }
    }

    const syslogOpts = {
      ...queryOptions,
      nat_ip: queryOptions.router_id || queryOptions.router_ids?.length ? undefined : queryOptions.nat_ip,
      router_id: undefined,
      router_ids: undefined,
    };
    const { sql, params } = buildSyslogSelect(schemaName, { ...syslogOpts, limit });
    addRows(await db.getMany<SyslogEntry>(sql, params));

    const baseLogs = merged
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit)
      .map(enrichLogEntryForDisplay);
    return await enrichLogsFromPppoeTable(schemaName, baseLogs);
  } catch (err) {
    console.error(`[logs] query failed for ${schemaName}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function insertTenantSyslog(
  schemaName: string,
  entry: Omit<LogEntry, "id" | "time"> & {
    raw_message?: string;
    user_port?: number;
    visited_port?: number;
  }
): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  const userPort = entry.user_port ?? null;
  const natPort = entry.nat_port ?? null;
  const visitedPort = entry.visited_port ?? entry.port ?? null;

  await db.query(
    `INSERT INTO "${schema}".syslogs
      (pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port, visited_ip, visited_port, protocol, raw_message)
     VALUES ($1,$2,$3::inet,$4,$5::inet,$6,$7::inet,$8,$9,$10)`,
    [
      entry.pppoe_user,
      entry.mac,
      entry.user_ip,
      userPort,
      entry.nat_ip,
      natPort,
      entry.visited_ip,
      visitedPort,
      entry.protocol ?? "TCP",
      entry.raw_message ?? null,
    ]
  );
}

export async function getLogsForTenantId(
  tenantId: number,
  options: SyslogQueryOptions = {}
): Promise<{ logs: LogEntry[]; schema_name: string | null }> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return { logs: [], schema_name: null };
  const logs = await queryTenantLogs(tenant.schema_name, options);
  return { logs, schema_name: tenant.schema_name };
}

async function queryTenantLogs(schemaName: string, options: SyslogQueryOptions): Promise<LogEntry[]> {
  let logs = await getTenantSyslogs(schemaName, options);
  if (options.require_connected) return logs;

  const stripDate = { ...options, from: undefined, to: undefined };
  const stripDevice = { ...options, nat_ip: undefined, router_id: undefined, router_ids: undefined };

  if (logs.length === 0 && (options.from || options.to)) {
    logs = await getTenantSyslogs(schemaName, stripDate);
  }
  if (logs.length === 0 && (options.nat_ip || options.router_id || options.router_ids?.length)) {
    logs = await getTenantSyslogs(schemaName, stripDevice);
  }
  if (
    logs.length === 0 &&
    (options.from || options.to) &&
    (options.nat_ip || options.router_id || options.router_ids?.length)
  ) {
    logs = await getTenantSyslogs(schemaName, {
      ...options,
      from: undefined,
      to: undefined,
      nat_ip: undefined,
      router_id: undefined,
      router_ids: undefined,
    });
  }
  return logs;
}

export async function resolveDefaultTenant() {
  const schema = process.env.DEFAULT_TENANT_SCHEMA ?? "tenant_001";
  return getTenantBySchema(schema);
}

export async function getLogsAcrossTenants(options: SyslogQueryOptions = {}): Promise<LogEntry[]> {
  try {
    const schemas = await getActiveTenantSchemas();
    if (schemas.length === 0) return [];

    const perTenant = Math.max(10, Math.floor((options.limit ?? 100) / schemas.length));
    const results = await Promise.all(
      schemas.map((schema) => getTenantSyslogs(schema, { ...options, limit: perTenant }))
    );
    return results
      .flat()
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, options.limit ?? 100);
  } catch {
    return [];
  }
}

export async function resolveLogsQuery(params: {
  tenant_id?: number | null;
  schema?: string | null;
  limit?: number;
  from?: string;
  to?: string;
  user?: string;
  mac?: string;
  nat_ip?: string;
  router_id?: number;
  router_ids?: number[];
  require_connected?: boolean;
}): Promise<{ logs: LogEntry[]; source: "tenant" | "all"; schema_name?: string; router_connected?: boolean }> {
  const options: SyslogQueryOptions = {
    limit: params.limit,
    from: params.from,
    to: params.to,
    user: params.user,
    mac: params.mac,
    nat_ip: params.nat_ip,
    router_id: params.router_id,
    router_ids: params.router_ids,
    require_connected: params.require_connected,
  };

  if (params.require_connected) {
    const defaultTenant = await resolveDefaultTenant();
    const schema = params.schema ?? defaultTenant?.schema_name;
    if (schema) {
      const { isAnyRouterConnected } = await import("@isp/core/services/device.service");
      const connected = await isAnyRouterConnected(schema);
      if (!connected) {
        return { logs: [], source: "tenant", schema_name: schema, router_connected: false };
      }
    }
  }

  const schemasToTry: string[] = [];

  if (params.tenant_id) {
    const tenant = await getTenantById(params.tenant_id);
    if (tenant) schemasToTry.push(tenant.schema_name);
  }
  if (params.schema && !schemasToTry.includes(params.schema)) {
    schemasToTry.push(params.schema);
  }
  const defaultTenant = await resolveDefaultTenant();
  if (defaultTenant && !schemasToTry.includes(defaultTenant.schema_name)) {
    schemasToTry.push(defaultTenant.schema_name);
  }

  for (const schemaName of schemasToTry) {
    const logs = await queryTenantLogs(schemaName, options);
    if (logs.length > 0) {
      return { logs, source: "tenant", schema_name: schemaName, router_connected: true };
    }
    if (await tenantHasAnyLogs(schemaName)) {
      const unfiltered = await getTenantSyslogs(schemaName, {
        ...options,
        from: undefined,
        to: undefined,
      });
      if (unfiltered.length > 0) {
        return { logs: unfiltered, source: "tenant", schema_name: schemaName, router_connected: true };
      }
      return { logs: [], source: "tenant", schema_name: schemaName };
    }
  }

  const allLogs = await getLogsAcrossTenants({ ...options, from: undefined, to: undefined });
  if (allLogs.length > 0) {
    return { logs: allLogs, source: "all" };
  }

  return {
    logs: [],
    source: "tenant",
    schema_name: defaultTenant?.schema_name ?? schemasToTry[0],
    router_connected: params.require_connected ? false : undefined,
  };
}

async function tenantHasAnyLogs(schemaName: string): Promise<boolean> {
  try {
    const schema = assertValidTenantSchema(schemaName);
    const row = await db.getOne<{ exists: boolean }>(
      `SELECT (
         EXISTS (SELECT 1 FROM "${schema}".session_logs LIMIT 1)
         OR EXISTS (SELECT 1 FROM "${schema}".syslogs LIMIT 1)
       ) AS exists`
    );
    return row?.exists ?? false;
  } catch {
    return false;
  }
}

export async function countTenantSyslogs(schemaName: string): Promise<number> {
  try {
    const schema = assertValidTenantSchema(schemaName);
    const row = await db.getOne<{ count: string }>(
      `SELECT (
         COALESCE((SELECT MAX(id) FROM "${schema}".session_logs), 0) +
         COALESCE((SELECT MAX(id) FROM "${schema}".syslogs), 0)
       )::text AS count`
    );
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getTenantLogTableCounts(schemaName: string): Promise<{
  session_logs: number;
  syslogs: number;
  total: number;
}> {
  try {
    const schema = assertValidTenantSchema(schemaName);
    const row = await db.getOne<{ session: string; syslog: string }>(
      `SELECT
         COALESCE((SELECT MAX(id) FROM "${schema}".session_logs), 0)::text AS session,
         COALESCE((SELECT MAX(id) FROM "${schema}".syslogs), 0)::text AS syslog`
    );
    const session = Number(row?.session ?? 0);
    const syslog = Number(row?.syslog ?? 0);
    return { session_logs: session, syslogs: syslog, total: session + syslog };
  } catch {
    return { session_logs: 0, syslogs: 0, total: 0 };
  }
}

function normalizeIngestEntry(
  raw: NonNullable<IngestLogsInput["logs"]>[number]
): Omit<LogEntry, "id" | "time"> & {
  raw_message?: string;
  user_port?: number;
  visited_port?: number;
} {
  return {
    pppoe_user: raw.pppoe_user ?? "",
    mac: raw.mac ?? raw.mac_address ?? "",
    user_ip: raw.user_ip ?? "",
    nat_ip: raw.nat_ip ?? "",
    visited_ip: raw.visited_ip ?? "",
    port: raw.port ?? raw.visited_port ?? 0,
    user_port: raw.user_port ?? undefined,
    nat_port: raw.nat_port ?? undefined,
    visited_port: raw.visited_port ?? raw.port ?? undefined,
    protocol: raw.protocol,
    raw_message: raw.raw_message,
  };
}

export async function ingestLogs(input: IngestLogsInput): Promise<{
  inserted: number;
  schema_name: string;
}> {
  let schemaName = input.schema;

  if (input.tenant_id) {
    const tenant = await getTenantById(input.tenant_id);
    if (!tenant) throw new Error("Tenant not found");
    schemaName = tenant.schema_name;
  }

  if (!schemaName) throw new Error("tenant_id or schema is required");

  const entries = input.logs ?? [];
  if (entries.length === 0) throw new Error("At least one log entry is required");

  for (const entry of entries) {
    await insertTenantSyslog(schemaName, normalizeIngestEntry(entry));
    if (entry.nat_ip) {
      const { touchDeviceLastSeen } = await import("@isp/core/services/device.service");
      await touchDeviceLastSeen(schemaName, entry.nat_ip).catch(() => {});
    }
  }

  if (input.tenant_id) {
    const { recordMetricsFromLogs } = await import("@isp/core/services/metrics.service");
    const logEntries = entries.map((e) => ({
      ...normalizeIngestEntry(e),
      time: new Date().toISOString(),
    }));
    await recordMetricsFromLogs(input.tenant_id, logEntries).catch(() => {});
  }

  return { inserted: entries.length, schema_name: schemaName };
}
