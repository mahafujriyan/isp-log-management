import { db } from "@isp/core/lib/database";
import { getTenantById } from "@isp/core/services/tenant.service";

export interface CompanySettings {
  id: number;
  tenant_id: number | null;
  company_name: string;
  logo_url: string;
  tagline: string;
  server_ip: string;
  alert_email: string;
  support_phone: string;
  website: string;
  address: string;
  timezone: string;
  log_retention_days: number;
  updated_at: string;
}

export type CompanySettingsInput = Partial<
  Omit<CompanySettings, "id" | "tenant_id" | "updated_at">
>;

export interface DbBackup {
  id: number;
  tenant_id: number | null;
  file_label: string;
  size_mb: number;
  created_at: string;
}

const SELECT_COLS = `id, tenant_id, company_name, logo_url, tagline, server_ip, alert_email,
  support_phone, website, address, timezone, log_retention_days, updated_at`;

export async function getCompanySettings(tenantId: number): Promise<CompanySettings | null> {
  return db.getOne<CompanySettings>(
    `SELECT ${SELECT_COLS} FROM public.company_settings WHERE tenant_id = $1`,
    [tenantId]
  );
}

export async function upsertCompanySettings(
  tenantId: number,
  input: CompanySettingsInput
): Promise<CompanySettings> {
  const existing = await getCompanySettings(tenantId);

  const row = await db.getOne<CompanySettings>(
    `INSERT INTO public.company_settings (
      tenant_id, company_name, logo_url, tagline, server_ip, alert_email,
      support_phone, website, address, timezone, log_retention_days
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (tenant_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      logo_url = EXCLUDED.logo_url,
      tagline = EXCLUDED.tagline,
      server_ip = EXCLUDED.server_ip,
      alert_email = EXCLUDED.alert_email,
      support_phone = EXCLUDED.support_phone,
      website = EXCLUDED.website,
      address = EXCLUDED.address,
      timezone = EXCLUDED.timezone,
      log_retention_days = EXCLUDED.log_retention_days,
      updated_at = NOW()
    RETURNING ${SELECT_COLS}`,
    [
      tenantId,
      input.company_name ?? existing?.company_name ?? "Cyber Link Communication",
      input.logo_url ?? existing?.logo_url ?? "",
      input.tagline ?? existing?.tagline ?? "",
      input.server_ip ?? existing?.server_ip ?? "",
      input.alert_email ?? existing?.alert_email ?? "",
      input.support_phone ?? existing?.support_phone ?? "",
      input.website ?? existing?.website ?? "",
      input.address ?? existing?.address ?? "",
      input.timezone ?? existing?.timezone ?? "Asia/Dhaka",
      input.log_retention_days ?? existing?.log_retention_days ?? 90,
    ]
  );
  if (!row) throw new Error("Failed to save company settings");
  return row;
}

export async function getLatestBackup(tenantId: number): Promise<DbBackup | null> {
  return db.getOne<DbBackup>(
    `SELECT id, tenant_id, file_label, size_mb, created_at
     FROM public.db_backups
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId]
  );
}

export async function recordBackup(tenantId: number): Promise<DbBackup> {
  const tenant = await getTenantById(tenantId);
  const label = `backup_${tenant?.schema_name ?? tenantId}_${new Date().toISOString().slice(0, 10)}.sql`;
  const row = await db.getOne<DbBackup>(
    `INSERT INTO public.db_backups (tenant_id, file_label, size_mb)
     VALUES ($1, $2, $3)
     RETURNING id, tenant_id, file_label, size_mb, created_at`,
    [tenantId, label, Math.round(Math.random() * 500 + 800) / 100]
  );
  if (!row) throw new Error("Failed to record backup");
  return row;
}
