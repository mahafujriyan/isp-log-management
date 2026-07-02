import { db } from "@isp/core/lib/database";
import type { CreateDeviceInput, Device } from "@isp/core/types";
import { getTenantById, getTenantBySchema } from "@isp/core/services/tenant.service";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

const ROUTER_ONLINE_SECONDS = 60;

interface DeviceRow {
  id: number;
  name: string;
  device_ip: string;
  config_type: string;
  nat_ip: string | null;
  syslog_user: string;
  syslog_port: number;
  listen_port: number;
  api_user: string | null;
  api_port: number | null;
  has_api_password: boolean;
  status: string;
  last_seen_at: string | null;
  last_api_sync: string | null;
  last_api_error: string | null;
  created_at: string;
  router_last_seen?: string | null;
  router_last_log?: string | null;
}

function isRecentlySeen(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;
  return Date.now() - seen <= ROUTER_ONLINE_SECONDS * 1000;
}

function mapDeviceStatus(
  row: Pick<
    DeviceRow,
    "status" | "last_seen_at" | "router_last_seen" | "last_api_sync" | "router_last_log"
  >
): Device["status"] {
  if (row.status === "disabled" || row.status === "offline") return "offline";
  if (
    isRecentlySeen(row.last_seen_at) ||
    isRecentlySeen(row.router_last_seen ?? null) ||
    isRecentlySeen(row.last_api_sync) ||
    isRecentlySeen(row.router_last_log ?? null)
  ) {
    return "receiving";
  }
  if (row.status === "active" || row.status === "receiving") return "offline";
  return "online";
}

function mapConfigType(configType: string): Device["config"] {
  const upper = configType.toUpperCase();
  if (upper === "ACCESS") return "ACCESS";
  if (upper === "BRAS") return "BRAS";
  return "NAT";
}

function mapDevice(row: DeviceRow & { users_today?: number }): Device {
  return {
    id: row.id,
    name: row.name,
    ip: row.device_ip,
    config: mapConfigType(row.config_type),
    nat_ip: row.nat_ip ?? row.device_ip,
    user: row.syslog_user,
    port: row.syslog_port,
    listen_port: row.listen_port,
    api_user: row.api_user ?? undefined,
    api_port: row.api_port ?? 8728,
    has_api_password: row.has_api_password,
    last_seen_at: row.last_seen_at,
    last_api_sync: row.last_api_sync,
    last_api_error: row.last_api_error,
    status: mapDeviceStatus(row),
    users_today: row.users_today ?? 0,
  };
}

const deviceSelectSql = `
  SELECT d.id, d.name, host(d.device_ip) AS device_ip, d.config_type,
         host(d.nat_ip) AS nat_ip, d.syslog_user, d.syslog_port, d.listen_port,
         d.api_user, d.api_port,
         (d.api_password IS NOT NULL AND d.api_password <> '') AS has_api_password,
         d.status, d.last_seen_at, d.last_api_sync, d.last_api_error, d.created_at,
         r.last_seen_at AS router_last_seen,
         (
           SELECT MAX(sl.log_time) FROM "%SCHEMA%".session_logs sl
           WHERE sl.router_id = r.id
         ) AS router_last_log,
         COALESCE((
           SELECT COUNT(*)::int FROM "%SCHEMA%".pppoe_users pu
           WHERE pu.router_id = r.id AND pu.last_seen_at >= CURRENT_DATE
         ), 0) AS users_today
  FROM "%SCHEMA%".devices d
  LEFT JOIN "%SCHEMA%".routers r ON host(r.router_ip) = host(d.device_ip)
`;

function deviceQuery(schema: string, where = "", order = "ORDER BY d.created_at DESC") {
  const schemaSafe = assertValidTenantSchema(schema);
  return deviceSelectSql.replace(/%SCHEMA%/g, schemaSafe) + where + " " + order;
}

/** Ensures devices table has api_* columns and MikroTik routers table (safe to re-run). */
async function ensureTenantDeviceSchema(schemaName: string): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await db.query(`SELECT public.create_tenant_schema($1)`, [schema]).catch(() => {});
  await db.query(`ALTER TABLE "${schema}".devices ADD COLUMN IF NOT EXISTS api_user VARCHAR(128)`);
  await db.query(`ALTER TABLE "${schema}".devices ADD COLUMN IF NOT EXISTS api_password VARCHAR(256)`);
  await db.query(`ALTER TABLE "${schema}".devices ADD COLUMN IF NOT EXISTS api_port INT DEFAULT 8728`);
  await db.query(`ALTER TABLE "${schema}".devices ADD COLUMN IF NOT EXISTS last_api_sync TIMESTAMPTZ`);
  await db.query(`ALTER TABLE "${schema}".devices ADD COLUMN IF NOT EXISTS last_api_error TEXT`);
}

export async function listTenantDevices(schemaName: string): Promise<Device[]> {
  const rows = await db.getMany<DeviceRow & { users_today: number }>(deviceQuery(schemaName));
  return rows.map(mapDevice);
}

export async function listDisabledTenantDevices(schemaName: string): Promise<Device[]> {
  const rows = await db.getMany<DeviceRow & { users_today: number }>(
    deviceQuery(
      schemaName,
      ` WHERE d.status = 'disabled'
          OR d.last_seen_at IS NULL
          OR d.last_seen_at < NOW() - INTERVAL '30 minutes'`
    )
  );
  return rows.map(mapDevice);
}

export async function recheckTenantDevices(schemaName: string): Promise<number> {
  const schema = assertValidTenantSchema(schemaName);

  await db.query(
    `DELETE FROM public.router_tenant_map m
     WHERE m.schema_name = $1
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".devices d
         WHERE host(d.device_ip) = host(m.router_ip)
       )`,
    [schema]
  );

  await db.query(
    `DELETE FROM "${schema}".routers r
     WHERE NOT EXISTS (
       SELECT 1 FROM "${schema}".devices d WHERE host(d.device_ip) = host(r.router_ip)
     )`
  );

  const result = await db.query(
    `UPDATE "${schema}".devices SET status = 'disabled'
     WHERE status = 'active'
       AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '30 minutes')`
  );
  return result.rowCount ?? 0;
}

export async function createTenantDevice(
  schemaName: string,
  input: CreateDeviceInput
): Promise<Device> {
  const schema = assertValidTenantSchema(schemaName);

  if (!input.name?.trim() || !input.device_ip?.trim()) {
    throw new Error("Device name and IP are required");
  }

  if (!input.api_password?.trim()) {
    throw new Error("Router password is required — enter MikroTik API or Winbox password");
  }

  if (!input.api_user?.trim()) {
    throw new Error("Router username is required (e.g. admin)");
  }

  await ensureTenantDeviceSchema(schema);

  const row = await db.getOne<DeviceRow>(
    `INSERT INTO "${schema}".devices
      (name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port,
       api_user, api_password, api_port, status)
     VALUES ($1, $2::inet, $3, $4::inet, $5, $6, $7, $8, $9, $10, 'active')
     RETURNING id, name, host(device_ip) AS device_ip, config_type,
               host(nat_ip) AS nat_ip, syslog_user, syslog_port, listen_port,
               api_user, api_port,
               (api_password IS NOT NULL AND api_password <> '') AS has_api_password,
               status, last_seen_at, created_at`,
    [
      input.name.trim(),
      input.device_ip.trim(),
      input.config_type ?? "NAT",
      input.nat_ip?.trim() ?? input.device_ip.trim(),
      input.syslog_user ?? input.api_user ?? "admin",
      input.syslog_port ?? 514,
      input.listen_port ?? 514,
      input.api_user?.trim() || null,
      input.api_password?.trim() || null,
      input.api_port ?? 8728,
    ]
  );

  if (!row) throw new Error("Failed to create device");

  const tenant = await getTenantBySchema(schemaName);
  if (tenant) {
    const { syncDeviceAsRouter } = await import("@isp/core/lib/db/ingest");
    await syncDeviceAsRouter(schemaName, tenant.id, {
      name: row.name,
      device_ip: row.device_ip,
      nat_ip: row.nat_ip,
      syslog_port: row.syslog_port,
    }).catch((err) => {
      console.warn("[device] router sync skipped:", err instanceof Error ? err.message : err);
    });
  }

  return mapDevice({ ...row, users_today: 0 });
}

export async function updateTenantDevice(
  schemaName: string,
  deviceId: number,
  input: Partial<CreateDeviceInput> & { status?: string }
): Promise<Device> {
  const schema = assertValidTenantSchema(schemaName);

  await ensureTenantDeviceSchema(schema);

  const row = await db.getOne<DeviceRow>(
    `UPDATE "${schema}".devices SET
       name = COALESCE($2, name),
       device_ip = COALESCE($3::inet, device_ip),
       config_type = COALESCE($4, config_type),
       nat_ip = COALESCE($5::inet, nat_ip),
       syslog_user = COALESCE($6, syslog_user),
       syslog_port = COALESCE($7, syslog_port),
       listen_port = COALESCE($8, listen_port),
       api_user = COALESCE($9, api_user),
       api_password = COALESCE($10, api_password),
       api_port = COALESCE($11, api_port),
       status = COALESCE($12, status)
     WHERE id = $1
     RETURNING id, name, host(device_ip) AS device_ip, config_type,
               host(nat_ip) AS nat_ip, syslog_user, syslog_port, listen_port,
               api_user, api_port,
               (api_password IS NOT NULL AND api_password <> '') AS has_api_password,
               status, last_seen_at, created_at`,
    [
      deviceId,
      input.name?.trim(),
      input.device_ip?.trim(),
      input.config_type,
      input.nat_ip?.trim(),
      input.syslog_user,
      input.syslog_port,
      input.listen_port,
      input.api_user?.trim() || null,
      input.api_password?.trim() || null,
      input.api_port,
      input.status,
    ]
  );

  if (!row) throw new Error("Device not found");

  const tenant = await getTenantBySchema(schemaName);
  if (tenant) {
    const { syncDeviceAsRouter } = await import("@isp/core/lib/db/ingest");
    await syncDeviceAsRouter(schemaName, tenant.id, {
      name: row.name,
      device_ip: row.device_ip,
      nat_ip: row.nat_ip,
      syslog_port: row.syslog_port,
    }).catch(() => {});
  }

  return mapDevice({ ...row, users_today: 0 });
}

export async function toggleTenantDevice(
  schemaName: string,
  deviceId: number,
  enabled: boolean
): Promise<Device> {
  return updateTenantDevice(schemaName, deviceId, {
    status: enabled ? "active" : "disabled",
  });
}

export async function deleteTenantDevice(schemaName: string, deviceId: number): Promise<boolean> {
  const schema = assertValidTenantSchema(schemaName);

  const device = await db.getOne<{ device_ip: string; nat_ip: string | null }>(
    `SELECT host(device_ip) AS device_ip, host(nat_ip) AS nat_ip
     FROM "${schema}".devices WHERE id = $1`,
    [deviceId]
  );
  if (!device) return false;

  await db.query(`DELETE FROM "${schema}".devices WHERE id = $1`, [deviceId]);

  await db.query(`DELETE FROM public.router_tenant_map WHERE host(router_ip) = $1`, [
    device.device_ip,
  ]);

  await db.query(
    `DELETE FROM "${schema}".routers r
     WHERE host(r.router_ip) = $1
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".devices d WHERE host(d.device_ip) = host(r.router_ip)
       )`,
    [device.device_ip]
  );

  return true;
}

export async function touchDeviceLastSeen(schemaName: string, deviceIp: string): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await db.query(
    `UPDATE "${schema}".devices
     SET last_seen_at = NOW(), status = 'active'
     WHERE host(device_ip) = $1 OR host(nat_ip) = $1`,
    [deviceIp]
  );
  await db.query(
    `UPDATE "${schema}".routers
     SET last_seen_at = NOW(), status = 'active'
     WHERE host(router_ip) = $1 OR host(nat_ip) = $1`,
    [deviceIp]
  );
}

/** Called by router-poller after API login success or failure. */
export async function recordDeviceApiSync(
  schemaName: string,
  deviceIp: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await ensureTenantDeviceSchema(schema);

  if (ok) {
    await db.query(
      `UPDATE "${schema}".devices
       SET last_api_sync = NOW(),
           last_api_error = NULL,
           last_seen_at = NOW(),
           status = 'active'
       WHERE host(device_ip) = $1`,
      [deviceIp]
    );
    await db.query(
      `UPDATE "${schema}".routers
       SET last_seen_at = NOW(), status = 'active'
       WHERE host(router_ip) = $1`,
      [deviceIp]
    );
    return;
  }

  await db.query(
    `UPDATE "${schema}".devices
     SET last_api_error = $2
     WHERE host(device_ip) = $1`,
    [deviceIp, (errorMessage ?? "API connection failed").slice(0, 500)]
  );
}

export async function countTenantDevices(schemaName: string): Promise<number> {
  try {
    const schema = assertValidTenantSchema(schemaName);
    const row = await db.getOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${schema}".devices WHERE status = 'active'`
    );
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function resolveDevicesQuery(params: {
  tenant_id?: number;
  schema?: string;
  disabled?: boolean;
}): Promise<{ devices: Device[]; schema_name: string | null; source: "tenant" }> {
  if (params.tenant_id) {
    const tenant = await getTenantById(params.tenant_id);
    if (tenant) {
      const devices = params.disabled
        ? await listDisabledTenantDevices(tenant.schema_name)
        : await listTenantDevices(tenant.schema_name);
      return { devices, schema_name: tenant.schema_name, source: "tenant" };
    }
  }

  if (params.schema) {
    const tenant = await getTenantBySchema(params.schema);
    if (tenant) {
      const devices = params.disabled
        ? await listDisabledTenantDevices(tenant.schema_name)
        : await listTenantDevices(tenant.schema_name);
      return { devices, schema_name: tenant.schema_name, source: "tenant" };
    }
  }

  if (params.disabled) {
    return { devices: [], schema_name: null, source: "tenant" };
  }

  return { devices: [], schema_name: null, source: "tenant" };
}

/** Map MikroTik device row → routers.id for log filtering (not nat_ip — that is the subscriber public IP). */
export async function resolveDeviceRouterId(
  schemaName: string,
  deviceId: number
): Promise<number | null> {
  const schema = assertValidTenantSchema(schemaName);
  const row = await db.getOne<{ router_id: number }>(
    `SELECT r.id AS router_id
     FROM "${schema}".devices d
     INNER JOIN "${schema}".routers r ON host(r.router_ip) = host(d.device_ip)
     WHERE d.id = $1
     LIMIT 1`,
    [deviceId]
  );
  return row?.router_id ?? null;
}

/** True when a device received syslog or API sync within 60 seconds. */
export async function isAnyRouterConnected(schemaName: string): Promise<boolean> {
  const schema = assertValidTenantSchema(schemaName);
  const row = await db.getOne<{ online: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM "${schema}".devices d
       WHERE COALESCE(d.status, 'active') NOT IN ('disabled', 'offline')
         AND (
           d.last_seen_at >= NOW() - INTERVAL '${ROUTER_ONLINE_SECONDS} seconds'
           OR d.last_api_sync >= NOW() - INTERVAL '${ROUTER_ONLINE_SECONDS} seconds'
           OR EXISTS (
             SELECT 1 FROM "${schema}".routers r
             WHERE host(r.router_ip) = host(d.device_ip)
               AND r.last_seen_at >= NOW() - INTERVAL '${ROUTER_ONLINE_SECONDS} seconds'
           )
         )
     ) AS online`
  );
  return row?.online ?? false;
}

/** Router IDs for devices currently receiving syslog. */
export async function listConnectedRouterIds(schemaName: string): Promise<number[]> {
  const schema = assertValidTenantSchema(schemaName);
  const rows = await db.getMany<{ id: number }>(
    `SELECT DISTINCT r.id
     FROM "${schema}".devices d
     INNER JOIN "${schema}".routers r ON host(r.router_ip) = host(d.device_ip)
     WHERE d.last_seen_at >= NOW() - INTERVAL '${ROUTER_ONLINE_SECONDS} seconds'
       AND COALESCE(d.status, 'active') NOT IN ('disabled', 'offline')`
  );
  return rows.map((r) => r.id);
}

export async function listConnectedDevices(schemaName: string): Promise<Device[]> {
  const devices = await listTenantDevices(schemaName);
  return devices.filter((d) => d.status === "receiving");
}
