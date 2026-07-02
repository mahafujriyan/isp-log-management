import { parseMikroTikSyslog } from "@isp/core/lib/parser";
import { findRouterByIp, ensureRouter, ingestParsedLog, resolveTenantForRouterIp } from "@isp/core/lib/db/ingest";
import { getTenantById, getTenantBySchema } from "@isp/core/services/tenant.service";
import { lookupPppoeByPrivateIp } from "@isp/core/services/pppoe-session.service";
import type { PppoeSessionMatch } from "@isp/core/services/pppoe-session.service";
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

const TENANT_CACHE_TTL_MS = 5 * 60_000;

interface TenantByIdEntry {
  schema_name: string;
  expiresAt: number;
}

interface TenantBySchemaEntry {
  id: number;
  schema_name: string;
  expiresAt: number;
}

const tenantSchemaByIdCache = new Map<number, TenantByIdEntry>();
const tenantBySchemaCache = new Map<string, TenantBySchemaEntry>();

function getTenantSchemaByIdCached(tenantId: number): string | undefined {
  const cached = tenantSchemaByIdCache.get(tenantId);
  if (!cached) return undefined;
  if (cached.expiresAt < Date.now()) {
    tenantSchemaByIdCache.delete(tenantId);
    return undefined;
  }
  return cached.schema_name;
}

function setTenantSchemaByIdCache(tenantId: number, schemaName: string): void {
  tenantSchemaByIdCache.set(tenantId, {
    schema_name: schemaName,
    expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
  });
}

function getTenantBySchemaCached(schemaName: string): TenantBySchemaEntry | undefined {
  const cached = tenantBySchemaCache.get(schemaName);
  if (!cached) return undefined;
  if (cached.expiresAt < Date.now()) {
    tenantBySchemaCache.delete(schemaName);
    return undefined;
  }
  return cached;
}

function setTenantBySchemaCache(id: number, schemaName: string): void {
  const expiresAt = Date.now() + TENANT_CACHE_TTL_MS;
  tenantBySchemaCache.set(schemaName, { id, schema_name: schemaName, expiresAt });
  tenantSchemaByIdCache.set(id, { schema_name: schemaName, expiresAt });
}

const isIpLike = (value?: string | null): boolean =>
  !!value?.trim() && /^\d{1,3}(\.\d{1,3}){3}$/.test(value.trim());

/**
 * Enrich parsed NAT log with the customer PPPoE session (matched by private IP).
 * Mutates `parsed` in place (username + customer MAC) and returns the matched
 * session so callers can expose router_name / session_status / last_seen_at.
 * Does NOT rewrite the raw log — display fields are regenerated downstream.
 */
async function enrichParsedFromTenant(
  schemaName: string,
  routerIp: string | undefined,
  parsed: ReturnType<typeof parseMikroTikSyslog>
): Promise<PppoeSessionMatch | null> {
  if (isIpLike(parsed.pppoe_user)) {
    parsed.pppoe_user = "";
  }

  if (!parsed.nat_ip && routerIp) {
    parsed.nat_ip = routerIp;
  }

  if (!parsed.user_ip) return null;

  const session = await lookupPppoeByPrivateIp(schemaName, parsed.user_ip).catch(() => null);
  if (!session) return null;

  // Always prefer real customer identity over NAT-log values (router MAC/IP).
  parsed.pppoe_user = session.username;
  if (session.mac_address) {
    parsed.mac_address = session.mac_address;
  }

  return session;
}

function parseMikroTikLogSummary(
  parsed: ReturnType<typeof parseMikroTikSyslog>,
  session?: PppoeSessionMatch | null
) {
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
    router_name: session?.router_name ?? null,
    session_status: session?.status ?? null,
    session_last_seen: session?.last_seen_at ?? null,
  };
}

export async function receiveSyslogMessage(input: ReceiveSyslogInput): Promise<ReceiveSyslogResult> {
  const startedAt = Date.now();
  const routerIpHint = input.router_ip;
  const parsed = parseMikroTikSyslog(input.raw_message, routerIpHint);
  const routerIp = routerIpHint || parsed.source_ip || parsed.router_hostname;

  let tenantId = input.tenant_id;
  let schemaName = input.schema;
  let routerId: number | null = null;

  const tResolveStart = Date.now();
  const existing = routerIp ? await resolveTenantForRouterIp(routerIp) : null;
  const resolveMs = Date.now() - tResolveStart;

  if (existing) {
    tenantId = existing.tenant_id;
    schemaName = existing.schema_name;
    routerId = existing.router_id;
    setTenantBySchemaCache(existing.tenant_id, existing.schema_name);
  }

  if (!schemaName && tenantId) {
    const cachedSchema = getTenantSchemaByIdCached(tenantId);
    if (cachedSchema !== undefined) {
      schemaName = cachedSchema;
    } else {
      const tenant = await getTenantById(tenantId);
      if (tenant) {
        schemaName = tenant.schema_name;
        setTenantBySchemaCache(tenant.id, tenant.schema_name);
      }
    }
  }

  if (!tenantId && schemaName) {
    const cachedTenant = getTenantBySchemaCached(schemaName);
    if (cachedTenant) {
      tenantId = cachedTenant.id;
    } else {
      const tenant = await getTenantBySchema(schemaName);
      if (tenant) {
        tenantId = tenant.id;
        setTenantBySchemaCache(tenant.id, tenant.schema_name);
      }
    }
  }

  if (!schemaName) {
    const fallback = process.env.DEFAULT_TENANT_SCHEMA;
    if (fallback) {
      const cachedTenant = getTenantBySchemaCached(fallback);
      if (cachedTenant) {
        schemaName = cachedTenant.schema_name;
        tenantId = cachedTenant.id;
      } else {
        const tenant = await getTenantBySchema(fallback);
        if (tenant) {
          schemaName = tenant.schema_name;
          tenantId = tenant.id;
          setTenantBySchemaCache(tenant.id, tenant.schema_name);
        }
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
    const existingRouter = await findRouterByIp(routerIp);
    if (existingRouter) {
      routerId = existingRouter.router_id;
      if (!schemaName) schemaName = existingRouter.schema_name;
      if (!tenantId) tenantId = existingRouter.tenant_id;
      setTenantBySchemaCache(existingRouter.tenant_id, existingRouter.schema_name);
    } else {
      const ctx = await ensureRouter(schemaName, tenantId, routerIp, parsed.router_hostname);
      routerId = ctx.router_id;
      setTenantBySchemaCache(ctx.tenant_id, ctx.schema_name);
    }
  }

  const tEnrichStart = Date.now();
  const session = await enrichParsedFromTenant(schemaName, routerIp, parsed);
  const enrichMs = Date.now() - tEnrichStart;

  const tIngestStart = Date.now();
  const ingest = await ingestParsedLog(schemaName, tenantId, routerId, parsed);
  const ingestMs = Date.now() - tIngestStart;

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

  const totalMs = Date.now() - startedAt;
  const perfMessage =
    `[syslog-perf] resolveTenantForRouterIp=${resolveMs}ms ` +
    `enrichParsedFromTenant=${enrichMs}ms ingestParsedLog=${ingestMs}ms total=${totalMs}ms`;
  if (totalMs > 100) {
    console.warn(`${perfMessage} router=${routerIp ?? "-"}`);
  } else {
    console.log(`${perfMessage} router=${routerIp ?? "-"}`);
  }

  return {
    ok: true,
    parsed: parseMikroTikLogSummary(parsed, session),
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
