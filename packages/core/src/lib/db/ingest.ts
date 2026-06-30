import { db } from "@isp/core/lib/database";
import type { ParsedMikroTikLog } from "@isp/core/lib/parser";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";
import { resolveLogTimestamp } from "@isp/core/utils/log-timestamp.utils";

export interface RouterContext {
  tenant_id: number;
  schema_name: string;
  router_id: number;
  router_ip: string;
  nat_ip: string | null;
}

export interface IngestResult {
  session_log_id: number | null;
  syslog_id: number | null;
  nat_log_id: number | null;
  router_id: number | null;
  schema_name: string;
}

export async function findRouterByIp(routerIp: string): Promise<RouterContext | null> {
  if (!routerIp) return null;

  const row = await db.getOne<{
    tenant_id: number;
    schema_name: string;
    router_id: number;
    router_ip: string;
    nat_ip: string | null;
  }>(
    `SELECT tenant_id, schema_name, router_id,
            host(router_ip) AS router_ip, host(nat_ip) AS nat_ip
     FROM public.router_tenant_map
     WHERE host(router_ip) = $1 OR host(nat_ip) = $1
     LIMIT 1`,
    [routerIp]
  );

  return row
    ? {
        tenant_id: row.tenant_id,
        schema_name: row.schema_name,
        router_id: row.router_id,
        router_ip: row.router_ip,
        nat_ip: row.nat_ip,
      }
    : null;
}

/** Match MikroTik source IP to a tenant via router map or devices table (any tenant). */
export async function resolveTenantForRouterIp(routerIp: string): Promise<RouterContext | null> {
  const mapped = await findRouterByIp(routerIp);
  if (mapped) return mapped;

  const tenants = await db.getMany<{ id: number; schema_name: string }>(
    `SELECT id, schema_name FROM public.tenants ORDER BY id`
  );

  for (const tenant of tenants) {
    const schema = assertValidTenantSchema(tenant.schema_name);
    const device = await db.getOne<{
      name: string;
      device_ip: string;
      nat_ip: string | null;
      syslog_port: number;
    }>(
      `SELECT name, host(device_ip) AS device_ip, host(nat_ip) AS nat_ip, syslog_port
       FROM "${schema}".devices
       WHERE host(device_ip) = $1 OR host(nat_ip) = $1
       LIMIT 1`,
      [routerIp]
    ).catch(() => null);

    if (device) {
      return syncDeviceAsRouter(schema, tenant.id, {
        name: device.name,
        device_ip: device.device_ip,
        nat_ip: device.nat_ip,
        syslog_port: device.syslog_port,
      });
    }
  }

  return null;
}

export async function syncDeviceAsRouter(
  schemaName: string,
  tenantId: number,
  device: { name: string; device_ip: string; nat_ip?: string | null; syslog_port?: number }
): Promise<RouterContext> {
  const schema = assertValidTenantSchema(schemaName);

  const row = await db.getOne<{ id: number; router_ip: string; nat_ip: string | null }>(
    `INSERT INTO "${schema}".routers (name, router_ip, nat_ip, syslog_port, last_seen_at)
     VALUES ($1, $2::inet, $3::inet, $4, NOW())
     ON CONFLICT (router_ip) DO UPDATE SET
       name = EXCLUDED.name,
       nat_ip = COALESCE(EXCLUDED.nat_ip, "${schema}".routers.nat_ip),
       syslog_port = EXCLUDED.syslog_port,
       last_seen_at = NOW()
     RETURNING id, host(router_ip) AS router_ip, host(nat_ip) AS nat_ip`,
    [device.name, device.device_ip, device.nat_ip ?? device.device_ip, device.syslog_port ?? 514]
  );

  if (!row) throw new Error("Failed to sync router");

  await db.query(
    `INSERT INTO public.router_tenant_map (tenant_id, schema_name, router_ip, router_id, nat_ip, updated_at)
     VALUES ($1, $2, $3::inet, $4, $5::inet, NOW())
     ON CONFLICT (router_ip) DO UPDATE SET
       router_id = EXCLUDED.router_id,
       nat_ip = COALESCE(EXCLUDED.nat_ip, public.router_tenant_map.nat_ip),
       updated_at = NOW()`,
    [tenantId, schema, device.device_ip, row.id, device.nat_ip ?? device.device_ip]
  );

  return {
    tenant_id: tenantId,
    schema_name: schema,
    router_id: row.id,
    router_ip: row.router_ip,
    nat_ip: row.nat_ip,
  };
}

export async function ensureRouter(
  schemaName: string,
  tenantId: number,
  routerIp: string,
  hostname?: string
): Promise<RouterContext> {
  const schema = assertValidTenantSchema(schemaName);
  const name = hostname?.trim() || `Router ${routerIp}`;

  let row = await db.getOne<{ id: number; router_ip: string; nat_ip: string | null }>(
    `SELECT id, host(router_ip) AS router_ip, host(nat_ip) AS nat_ip
     FROM "${schema}".routers WHERE host(router_ip) = $1`,
    [routerIp]
  );

  if (!row) {
    row = await db.getOne<{ id: number; router_ip: string; nat_ip: string | null }>(
      `INSERT INTO "${schema}".routers (name, router_ip, identity, last_seen_at)
       VALUES ($1, $2::inet, $3, NOW())
       ON CONFLICT (router_ip) DO UPDATE SET last_seen_at = NOW()
       RETURNING id, host(router_ip) AS router_ip, host(nat_ip) AS nat_ip`,
      [name, routerIp, hostname ?? null]
    );
  } else {
    await db.query(
      `UPDATE "${schema}".routers SET last_seen_at = NOW(), status = 'active' WHERE id = $1`,
      [row.id]
    );
  }

  if (!row) throw new Error("Failed to register router");

  await db.query(
    `INSERT INTO public.router_tenant_map (tenant_id, schema_name, router_ip, router_id, nat_ip, updated_at)
     VALUES ($1, $2, $3::inet, $4, $5::inet, NOW())
     ON CONFLICT (router_ip) DO UPDATE SET
       router_id = EXCLUDED.router_id,
       nat_ip = COALESCE(EXCLUDED.nat_ip, public.router_tenant_map.nat_ip),
       updated_at = NOW()`,
    [tenantId, schema, routerIp, row.id, row.nat_ip]
  );

  return {
    tenant_id: tenantId,
    schema_name: schema,
    router_id: row.id,
    router_ip: row.router_ip,
    nat_ip: row.nat_ip,
  };
}

async function upsertPppoeUser(
  schema: string,
  routerId: number | null,
  parsed: ParsedMikroTikLog
): Promise<void> {
  if (!parsed.pppoe_user) return;

  await db.query(
    `INSERT INTO "${schema}".pppoe_users
      (username, mac_address, last_private_ip, last_public_ip, router_id, session_count, last_seen_at)
     VALUES ($1, $2, $3::inet, $4::inet, $5, 1, NOW())
     ON CONFLICT (username) DO UPDATE SET
       mac_address = COALESCE(NULLIF(EXCLUDED.mac_address, ''), "${schema}".pppoe_users.mac_address),
       last_private_ip = COALESCE(EXCLUDED.last_private_ip, "${schema}".pppoe_users.last_private_ip),
       last_public_ip = COALESCE(EXCLUDED.last_public_ip, "${schema}".pppoe_users.last_public_ip),
       router_id = COALESCE(EXCLUDED.router_id, "${schema}".pppoe_users.router_id),
       session_count = "${schema}".pppoe_users.session_count + 1,
       last_seen_at = NOW()`,
    [
      parsed.pppoe_user,
      parsed.mac_address || null,
      parsed.user_ip || null,
      parsed.nat_ip || null,
      routerId,
    ]
  );
}

export async function ingestParsedLog(
  schemaName: string,
  tenantId: number,
  routerId: number | null,
  parsed: ParsedMikroTikLog
): Promise<IngestResult> {
  const schema = assertValidTenantSchema(schemaName);
  const logTime = resolveLogTimestamp(parsed);

  const sessionRow = await db.getOne<{ id: number }>(
    `INSERT INTO "${schema}".session_logs
      (log_time, router_id, pppoe_user, mac_address, user_ip, user_port,
       nat_ip, nat_port, visited_ip, visited_port, protocol, log_topic, raw_message)
     VALUES ($1, $2, $3, $4, $5::inet, $6, $7::inet, $8, $9::inet, $10, $11, $12, $13)
     RETURNING id`,
    [
      logTime,
      routerId,
      parsed.pppoe_user || null,
      parsed.mac_address || null,
      parsed.user_ip || null,
      parsed.user_port,
      parsed.nat_ip || null,
      parsed.nat_port,
      parsed.visited_ip || null,
      parsed.visited_port,
      parsed.protocol,
      parsed.log_topic,
      parsed.raw_message,
    ]
  );

  const syslogRow = await db.getOne<{ id: number }>(
    `INSERT INTO "${schema}".syslogs
      (received_at, pppoe_user, mac_address, user_ip, user_port, nat_ip, nat_port,
       visited_ip, visited_port, protocol, raw_message)
     VALUES ($1, $2, $3, $4::inet, $5, $6::inet, $7, $8::inet, $9, $10, $11)
     RETURNING id`,
    [
      logTime,
      parsed.pppoe_user || null,
      parsed.mac_address || null,
      parsed.user_ip || null,
      parsed.user_port,
      parsed.nat_ip || null,
      parsed.nat_port,
      parsed.visited_ip || null,
      parsed.visited_port,
      parsed.protocol,
      parsed.raw_message,
    ]
  );

  let natLogId: number | null = null;
  if (parsed.pppoe_user && parsed.user_ip && parsed.nat_ip && parsed.visited_ip) {
    const natRow = await db.getOne<{ id: number }>(
      `INSERT INTO public.nat_logs
        (log_time, pppoe_user, mac_address, private_ip, public_ip, public_port,
         dest_ip, dest_port, protocol, device_name)
       VALUES ($1, $2, $3, $4::inet, $5::inet, $6, $7::inet, $8, $9, $10)
       RETURNING id`,
      [
        logTime,
        parsed.pppoe_user,
        parsed.mac_address || "00:00:00:00:00:00",
        parsed.user_ip,
        parsed.nat_ip,
        parsed.nat_port ?? parsed.user_port ?? 0,
        parsed.visited_ip,
        parsed.visited_port ?? 0,
        parsed.protocol,
        parsed.router_hostname || null,
      ]
    );
    natLogId = natRow?.id ?? null;
  }

  await upsertPppoeUser(schema, routerId, parsed);

  if (parsed.source_ip || parsed.nat_ip) {
    const touchIp = parsed.source_ip || parsed.nat_ip;
    const { touchDeviceLastSeen } = await import("@isp/core/services/device.service");
    await touchDeviceLastSeen(schema, touchIp).catch(() => {});
  }

  return {
    session_log_id: sessionRow?.id ?? null,
    syslog_id: syslogRow?.id ?? null,
    nat_log_id: natLogId,
    router_id: routerId,
    schema_name: schema,
  };
}
