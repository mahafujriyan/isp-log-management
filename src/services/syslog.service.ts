import { db } from "@/lib/database";
import type { IngestLogsInput, LogEntry, SyslogEntry } from "@/types";
import {
  getActiveTenantSchemas,
  getTenantById,
  getTenantBySchema,
  syslogToLogEntry,
} from "@/services/tenant.service";
import { assertValidTenantSchema } from "@/utils/schema.utils";
import { generateMockLogEntry } from "@/services/mock-data.service";

interface SyslogQueryOptions {
  limit?: number;
  from?: string;
  to?: string;
  user?: string;
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
    sql += ` AND (LOWER(pppoe_user) LIKE LOWER($${params.length}) OR host(user_ip) LIKE $${params.length} OR host(visited_ip) LIKE $${params.length})`;
  }

  params.push(options.limit ?? 100);
  sql += ` ORDER BY received_at DESC LIMIT $${params.length}`;

  return { sql, params };
}

export async function getTenantSyslogs(
  schemaName: string,
  options: SyslogQueryOptions = {}
): Promise<LogEntry[]> {
  try {
    const { sql, params } = buildSyslogSelect(schemaName, options);
    const rows = await db.getMany<SyslogEntry>(sql, params);
    return rows.map(syslogToLogEntry);
  } catch {
    return [];
  }
}

export async function insertTenantSyslog(
  schemaName: string,
  entry: Omit<LogEntry, "id" | "time"> & { raw_message?: string }
): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await db.query(
    `INSERT INTO "${schema}".syslogs
      (pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port, visited_ip, visited_port, protocol, raw_message)
     VALUES ($1,$2,$3::inet,$4,$5::inet,$6,$7::inet,$8,$9,$10)`,
    [
      entry.pppoe_user,
      entry.mac,
      entry.user_ip,
      entry.nat_port ?? null,
      entry.nat_ip,
      entry.port,
      entry.visited_ip,
      entry.port,
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
}): Promise<{ logs: LogEntry[]; source: "tenant" | "all" | "mock"; schema_name?: string }> {
  const options: SyslogQueryOptions = {
    limit: params.limit,
    from: params.from,
    to: params.to,
    user: params.user,
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

  const mockLogs = Array.from({ length: Math.min(options.limit ?? 50, 200) }, () =>
    generateMockLogEntry()
  );
  return { logs: mockLogs, source: "mock" };
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
): Omit<LogEntry, "id" | "time"> & { raw_message?: string } {
  return {
    pppoe_user: raw.pppoe_user ?? "",
    mac: raw.mac ?? raw.mac_address ?? "",
    user_ip: raw.user_ip ?? "",
    nat_ip: raw.nat_ip ?? "",
    visited_ip: raw.visited_ip ?? "",
    port: raw.port ?? raw.visited_port ?? 0,
    nat_port: raw.nat_port ?? raw.user_port,
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
  }

  return { inserted: entries.length, schema_name: schemaName };
}
