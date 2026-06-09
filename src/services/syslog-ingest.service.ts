import { parseMikroTikSyslog } from "@/lib/parser";
import { ensureRouter, findRouterByIp, ingestParsedLog } from "@/lib/db/ingest";
import { getTenantById, getTenantBySchema } from "@/services/tenant.service";
import type { LogEntry } from "@/types";

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
  };
}

export async function receiveSyslogMessage(input: ReceiveSyslogInput): Promise<ReceiveSyslogResult> {
  const parsed = parseMikroTikSyslog(input.raw_message);
  const routerIp = input.router_ip || parsed.source_ip || parsed.router_hostname;

  let tenantId = input.tenant_id;
  let schemaName = input.schema;
  let routerId: number | null = null;

  const existing = routerIp ? await findRouterByIp(routerIp) : null;
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

  const ingest = await ingestParsedLog(schemaName, tenantId, routerId, parsed);

  if (tenantId) {
    const logEntry: LogEntry & { raw_message?: string } = {
      time: parsed.timestamp.toISOString(),
      pppoe_user: parsed.pppoe_user,
      mac: parsed.mac_address,
      user_ip: parsed.user_ip,
      nat_ip: parsed.nat_ip,
      visited_ip: parsed.visited_ip,
      port: parsed.visited_port ?? 0,
      nat_port: parsed.nat_port ?? undefined,
      protocol: parsed.protocol,
      raw_message: parsed.raw_message,
    };
    const { recordMetricsFromLogs } = await import("@/services/metrics.service");
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
