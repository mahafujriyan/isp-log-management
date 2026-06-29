import { db } from "@isp/core/lib/database";
import type { CreateTenantInput, LogEntry, Plan, SyslogEntry, Tenant } from "@isp/core/types";
import { assertValidTenantSchema, buildTenantSchemaName, isValidTenantSchemaName } from "@isp/core/utils/schema.utils";

export async function listPlans(): Promise<Plan[]> {
  return db.getMany<Plan>("SELECT * FROM public.plans ORDER BY price_bdt ASC");
}

export async function listTenants(): Promise<Tenant[]> {
  return db.getMany<Tenant>(
    `SELECT t.*, p.name AS plan_name
     FROM public.tenants t
     LEFT JOIN public.plans p ON p.id = t.plan_id
     ORDER BY t.created_at DESC`
  );
}

export async function getTenantById(id: number): Promise<Tenant | null> {
  return db.getOne<Tenant>("SELECT * FROM public.tenants WHERE id = $1", [id]);
}

export async function getTenantBySchema(schemaName: string): Promise<Tenant | null> {
  const schema = assertValidTenantSchema(schemaName);
  return db.getOne<Tenant>("SELECT * FROM public.tenants WHERE schema_name = $1", [schema]);
}

export async function provisionTenantSchema(schemaName: string): Promise<void> {
  const schema = assertValidTenantSchema(schemaName);
  await db.query("SELECT public.create_tenant_schema($1)", [schema]);
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { admin_name, admin_email, plan_id, expires_in_days = 90 } = input;

  if (!admin_name?.trim() || !admin_email?.trim()) {
    throw new Error("Admin name and email are required");
  }

  const plan = await db.getOne<Plan>("SELECT id FROM public.plans WHERE id = $1", [plan_id]);
  if (!plan) throw new Error("Invalid plan_id");

  const pendingSchema = `tenant_pending_${Date.now()}`;

  const inserted = await db.getOne<Tenant>(
    `INSERT INTO public.tenants (admin_name, admin_email, schema_name, plan_id, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::interval)
     RETURNING *`,
    [admin_name.trim(), admin_email.trim().toLowerCase(), pendingSchema, plan_id, String(expires_in_days)]
  );

  if (!inserted) throw new Error("Failed to insert tenant");

  const schemaName = buildTenantSchemaName(inserted.id);

  try {
    await provisionTenantSchema(schemaName);

    const tenant = await db.getOne<Tenant>(
      `UPDATE public.tenants SET schema_name = $1 WHERE id = $2 RETURNING *`,
      [schemaName, inserted.id]
    );

    if (!tenant) throw new Error("Failed to update tenant schema name");
    return tenant;
  } catch (error) {
    await db.query("DELETE FROM public.tenants WHERE id = $1", [inserted.id]);
    throw error;
  }
}

export async function getActiveTenantSchemas(): Promise<string[]> {
  const rows = await db.getMany<{ schema_name: string }>(
    "SELECT schema_name FROM public.tenants WHERE status = 'active' ORDER BY id"
  );
  return rows.map((r) => r.schema_name).filter((n) => isValidTenantSchemaName(n) && !n.includes("pending"));
}

export async function updateTenantStatus(id: number, status: string): Promise<Tenant | null> {
  const allowed = ["active", "suspended", "expired"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  return db.getOne<Tenant>(
    `UPDATE public.tenants SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
}

export function syslogToLogEntry(row: SyslogEntry): LogEntry {
  return {
    id: row.id,
    time: new Date(row.received_at).toISOString(),
    pppoe_user: row.pppoe_user ?? "",
    mac: row.mac_address ?? "",
    user_ip: row.user_ip ?? "",
    user_port: row.user_port ?? undefined,
    nat_ip: row.nat_ip ?? "",
    nat_port: row.nat_port ?? undefined,
    visited_ip: row.visited_ip ?? "",
    port: row.visited_port ?? 0,
    protocol: row.protocol ?? undefined,
    raw_message: row.raw_message ?? undefined,
  };
}
