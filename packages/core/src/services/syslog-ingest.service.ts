import { parseMikroTikSyslog } from "@isp/core/lib/parser";
import { findRouterByIp, ensureRouter, ingestParsedLog, resolveTenantForRouterIp } from "@isp/core/lib/db/ingest";
import { getTenantById, getTenantBySchema } from "@isp/core/services/tenant.service";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";
import { db } from "@isp/core/lib/database";
import type { LogEntry } from "@isp/core/types";

export interface ReceiveSyslogInput {
  raw_message: string;
  router_ip?: string;
  tenant_id?: number;
  schema?: string;
  auto_register_router?: boolean;
}

export interface ReceiveSyslogResult {
  ok: boolean;
  parsed: ReturnType<typeof parseMikroTikLogSummary>;
  ingest: Awaited<ReturnType<typeof ingestParsedLog>> | null;
  error?: string;
}

async function enrichParsedFromTenant(
  schemaName: string,
  routerIp: string | undefined,
  parsed: ReturnType<typeof parseMikroTikSyslog>
): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);

  const isIpLike = (value?: string | null): boolean =>
    !!value?.trim() && /^\d{1,3}(\.\d{1,3}){3}$/.test(value.trim());

  if (isIpLike(parsed.pppoe_user)) {
    parsed.pppoe_user = "";
  }

  if (!parsed.nat_ip && routerIp) {
    parsed.nat_ip = routerIp;
  }

  if (!parsed.pppoe_user && parsed.user_ip) {
    const row = await db.getOne<{ username: string; mac_address: string | null }>(
      `SELECT username, mac_address FROM "${schema}".pppoe_users
       WHERE status = 'active' AND host(last_private_ip) = $1
       ORDER BY last_seen_at DESC LIMIT 1`,
      [parsed.user_ip]
    );
    if (row?.username && !isIpLike(row.username)) {
      parsed.pppoe_user = row.username;
      if (!parsed.mac_address && row.mac_address) {
        parsed.mac_address = row.mac_address;
      }
    }
  }

  if (!parsed.raw_message.includes("pppoe_user=") && parsed.user_ip && parsed.visited_ip) {
    const { formatIspLogLine } = await import("@isp/core/utils/mikrotik-parser.utils");
    parsed.raw_message = formatIspLogLine({
      pppoe_user: parsed.pppoe_user,
      mac: parsed.mac_address,
      user_ip: parsed.user_ip,
      user_port: parsed.user_port ?? undefined,
      nat_ip: parsed.nat_ip,
      nat_port: parsed.nat_port ?? undefined,
      visited_ip: parsed.visited_ip,
      port: parsed.visited_port ?? 0,
      protocol: parsed.protocol,
    });
  }
}

function parseMikroTikLogSummary(parsed: ReturnType<typeof parseMikroTikSyslog>) {
  return {
    timestamp: parsed.timestamp.toISOString(),
    pppoe_user: parsed.pppoe_user,
    mac_address: parsed.mac_address,
    user_ip: parsed.user_ip,
    user_port: parsed.user_port,
    nat_ip: parsed.nat_ip,
    nat_port: parsed.nat_port,
    visited_ip: parsed.visited_ip,
    visited_port: parsed.visited_port,
    protocol: parsed.protocol,
    log_topic: parsed.log_topic,
    source_ip: parsed.source_ip,
    raw_message: parsed.raw_message,
  };
}

export async function receiveSyslogMessage(input: ReceiveSyslogInput): Promise<ReceiveSyslogResult> {
  const routerIpHint = input.router_ip;
  const parsed = parseMikroTikSyslog(input.raw_message, routerIpHint);
  const routerIp = routerIpHint || parsed.source_ip || parsed.router_hostname;

  let tenantId = input.tenant_id;
  let schemaName = input.schema;
  let routerId: number | null = null;

  const existing = routerIp ? await resolveTenantForRouterIp(routerIp) : null;
  if (existing) {
    tenantId = existing.tenant_id;
    schemaName = existing.schema_name;
    routerId = existing.router_id;
  }

  if (!schemaName && tenantId) {
    const tenant = await getTenantById(tenantId);
    schemaName = tenant?.schema_name;
  }

  if (!schemaName) {
    const fallback = process.env.DEFAULT_TENANT_SCHEMA;
    if (fallback) {
      const tenant = await getTenantBySchema(fallback);
      if (tenant) {
        schemaName = tenant.schema_name;
        tenantId = tenant.id;
      }
    }
  }

  if (!schemaName || !tenantId) {
    return {
      ok: false,
      parsed: parseMikroTikLogSummary(parsed),
      ingest: null,
      error: "Unknown router — register device/router or pass tenant_id/schema",
    };
  }

  if (!routerId && routerIp && input.auto_register_router !== false) {
    const ctx = await ensureRouter(schemaName, tenantId, routerIp, parsed.router_hostname);
    routerId = ctx.router_id;
  }

  await enrichParsedFromTenant(schemaName, routerIp, parsed);

  const ingest = await ingestParsedLog(schemaName, tenantId, routerId, parsed);

  if (tenantId) {
    const logEntry: LogEntry & { raw_message?: string } = {
      time: parsed.timestamp.toISOString(),
      pppoe_user: parsed.pppoe_user,
      mac: parsed.mac_address,
      user_ip: parsed.user_ip,
      user_port: parsed.user_port ?? undefined,
      nat_ip: parsed.nat_ip,
      visited_ip: parsed.visited_ip,
      port: parsed.visited_port ?? 0,
      nat_port: parsed.nat_port ?? undefined,
      protocol: parsed.protocol,
      raw_message: parsed.raw_message,
    };
    const { recordMetricsFromLogs } = await import("@isp/core/services/metrics.service");
    await recordMetricsFromLogs(tenantId, [logEntry]).catch(() => {});
  }

  return {
    ok: true,
    parsed: parseMikroTikLogSummary(parsed),
    ingest,
  };
}

export async function receiveSyslogBatch(
  messages: ReceiveSyslogInput[]
): Promise<{ inserted: number; results: ReceiveSyslogResult[] }> {
  const results: ReceiveSyslogResult[] = [];
  let inserted = 0;

  for (const msg of messages) {
    const result = await receiveSyslogMessage(msg);
    results.push(result);
    if (result.ok) inserted += 1;
  }

  return { inserted, results };
}
