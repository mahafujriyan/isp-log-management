import { db } from "@/lib/database";
import type { CreateDeviceInput, Device } from "@/types";
import { getTenantById, getTenantBySchema } from "@/services/tenant.service";
import { DEMO_DEVICES } from "@/services/mock-data.service";
import { assertValidTenantSchema } from "@/utils/schema.utils";

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

function mapDevice(row: DeviceRow): Device {
  const status =
    row.status === "active" || row.status === "receiving"
      ? "receiving"
      : row.status === "offline"
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
    users_today: 0,
  };
}

export async function listTenantDevices(schemaName: string): Promise<Device[]> {
  const schema = assertValidTenantSchema(schemaName);
  const rows = await db.getMany<DeviceRow>(
    `SELECT id, name, host(device_ip) AS device_ip, config_type,
            host(nat_ip) AS nat_ip, syslog_user, syslog_port, listen_port,
            status, last_seen_at, created_at
     FROM "${schema}".devices
     ORDER BY created_at DESC`
  );
  return rows.map(mapDevice);
}

export async function createTenantDevice(
  schemaName: string,
  input: CreateDeviceInput
): Promise<Device> {
  const schema = assertValidTenantSchema(schemaName);

  if (!input.name?.trim() || !input.device_ip?.trim()) {
    throw new Error("Device name and IP are required");
  }

  const row = await db.getOne<DeviceRow>(
    `INSERT INTO "${schema}".devices
      (name, device_ip, config_type, nat_ip, syslog_user, syslog_port, listen_port, status)
     VALUES ($1, $2::inet, $3, $4::inet, $5, $6, $7, 'active')
     RETURNING id, name, host(device_ip) AS device_ip, config_type,
               host(nat_ip) AS nat_ip, syslog_user, syslog_port, listen_port,
               status, last_seen_at, created_at`,
    [
      input.name.trim(),
      input.device_ip.trim(),
      input.config_type ?? "NAT",
      input.nat_ip?.trim() ?? input.device_ip.trim(),
      input.syslog_user ?? "log",
      input.syslog_port ?? 514,
      input.listen_port ?? 514,
    ]
  );

  if (!row) throw new Error("Failed to create device");
  return mapDevice(row);
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
}): Promise<{ devices: Device[]; schema_name: string | null; source: "tenant" | "mock" }> {
  if (params.tenant_id) {
    const tenant = await getTenantById(params.tenant_id);
    if (tenant) {
      const devices = await listTenantDevices(tenant.schema_name);
      return { devices, schema_name: tenant.schema_name, source: "tenant" };
    }
  }

  if (params.schema) {
    const tenant = await getTenantBySchema(params.schema);
    if (tenant) {
      const devices = await listTenantDevices(tenant.schema_name);
      return { devices, schema_name: tenant.schema_name, source: "tenant" };
    }
  }

  return { devices: DEMO_DEVICES, schema_name: null, source: "mock" };
}
