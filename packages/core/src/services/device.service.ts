import { db } from "@isp/core/lib/database";
import type { CreateDeviceInput, Device } from "@isp/core/types";
import { getTenantById, getTenantBySchema } from "@isp/core/services/tenant.service";
import { DEMO_DEVICES } from "@isp/core/services/mock-data.service";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

interface DeviceRow {
  id: number;
  name: string;
  device_ip: string;
  config_type: string;
  nat_ip: string | null;
  syslog_user: string;
  syslog_port: number;
  listen_port: number;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

function mapDevice(row: DeviceRow & { users_today?: number }): Device {
  const status =
    row.status === "active" || row.status === "receiving"
      ? "receiving"
      : row.status === "offline" || row.status === "disabled"
        ? "offline"
        : "online";

  return {
    id: row.id,
    name: row.name,
    ip: row.device_ip,
    config: row.config_type === "ACCESS" ? "ACCESS" : "NAT",
    nat_ip: row.nat_ip ?? row.device_ip,
    user: row.syslog_user,
    port: row.syslog_port,
    listen_port: row.listen_port,
    status,
    users_today: row.users_today ?? 0,
  };
}

const deviceSelectSql = `
  SELECT d.id, d.name, host(d.device_ip) AS device_ip, d.config_type,
         host(d.nat_ip) AS nat_ip, d.syslog_user, d.syslog_port, d.listen_port,
         d.status, d.last_seen_at, d.created_at,
         (
           SELECT COUNT(DISTINCT s.pppoe_user)::int
           FROM "%SCHEMA%".syslogs s
           WHERE s.received_at >= CURRENT_DATE
             AND host(s.nat_ip) = host(d.nat_ip)
         ) AS users_today
  FROM "%SCHEMA%".devices d
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

  await ensureTenantDeviceSchema(schema);

  const row = await db.getOne<DeviceRow>(
    `INSERT INTO "${schema}".devices
      (name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port,
       api_user, api_password, api_port, status)
     VALUES ($1, $2::inet, $3, $4::inet, $5, $6, $7, $8, $9, $10, 'active')
     RETURNING id, name, host(device_ip) AS device_ip, config_type,
               host(nat_ip) AS nat_ip, syslog_user, syslog_port, listen_port,
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
  return mapDevice({ ...row, users_today: 0 });
}

export async function deleteTenantDevice(schemaName: string, deviceId: number): Promise<boolean> {
  const schema = assertValidTenantSchema(schemaName);
  const result = await db.query(`DELETE FROM "${schema}".devices WHERE id = $1`, [deviceId]);
  return (result.rowCount ?? 0) > 0;
}

export async function touchDeviceLastSeen(schemaName: string, deviceIp: string): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await db.query(
    `UPDATE "${schema}".devices
     SET last_seen_at = NOW(), status = 'active'
     WHERE host(device_ip) = $1 OR host(nat_ip) = $1`,
    [deviceIp]
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
}): Promise<{ devices: Device[]; schema_name: string | null; source: "tenant" | "mock" }> {
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
    return { devices: [], schema_name: null, source: "mock" };
  }

  return { devices: DEMO_DEVICES, schema_name: null, source: "mock" };
}
