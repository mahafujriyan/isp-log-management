import { db } from "@isp/core/lib/database";
import type { IngestLogsInput, LogEntry, SyslogEntry } from "@isp/core/types";
import {
  getActiveTenantSchemas,
  getTenantById,
  getTenantBySchema,
  syslogToLogEntry,
} from "@isp/core/services/tenant.service";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

interface SyslogQueryOptions {
  limit?: number;
  from?: string;
  to?: string;
  user?: string;
  mac?: string;
  nat_ip?: string;
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
    sql += ` AND received_at >= $${params.length}`;
  }
  if (options.to) {
    params.push(options.to);
    sql += ` AND received_at <= $${params.length}`;
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

export async function getTenantSyslogs(
  schemaName: string,
  options: SyslogQueryOptions = {}
): Promise<LogEntry[]> {
  const schemaSafe = assertValidTenantSchema(schemaName);

  try {
    const sessionTable = await db.getOne<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'session_logs'
       ) AS exists`,
      [schemaSafe]
    );

    if (sessionTable?.exists) {
      const { sql, params } = buildSessionLogsSelect(schemaName, options);
      const rows = await db.getMany<SyslogEntry>(sql, params);
      if (rows.length > 0) return rows.map(syslogToLogEntry);
    }

    const { sql, params } = buildSyslogSelect(schemaName, options);
    const rows = await db.getMany<SyslogEntry>(sql, params);
    return rows.map(syslogToLogEntry);
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
  const logs = await getTenantSyslogs(tenant.schema_name, options);
  return { logs, schema_name: tenant.schema_name };
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
}): Promise<{ logs: LogEntry[]; source: "tenant" | "all"; schema_name?: string }> {
  const options: SyslogQueryOptions = {
    limit: params.limit,
    from: params.from,
    to: params.to,
    user: params.user,
    mac: params.mac,
    nat_ip: params.nat_ip,
  };

  if (params.tenant_id) {
    const { logs, schema_name } = await getLogsForTenantId(params.tenant_id, options);
    if (schema_name) return { logs, source: "tenant", schema_name };
  }

  if (params.schema) {
    const tenant = await getTenantBySchema(params.schema);
    if (tenant) {
      const logs = await getTenantSyslogs(tenant.schema_name, options);
      return { logs, source: "tenant", schema_name: tenant.schema_name };
    }
  }

  const allLogs = await getLogsAcrossTenants(options);
  if (allLogs.length > 0) return { logs: allLogs, source: "all" };

  return { logs: [], source: "tenant" };
}

export async function countTenantSyslogs(schemaName: string): Promise<number> {
  try {
    const schema = assertValidTenantSchema(schemaName);
    const row = await db.getOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${schema}".syslogs`
    );
    return Number(row?.count ?? 0);
  } catch {
    return 0;
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
