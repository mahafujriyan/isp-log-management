import { db } from "@/lib/database";
import { getTenantById } from "@/services/tenant.service";

export interface CompanySettings {
  id: number;
  tenant_id: number | null;
  company_name: string;
  server_ip: string;
  alert_email: string;
  log_retention_days: number;
  updated_at: string;
}

export interface DbBackup {
  id: number;
  tenant_id: number | null;
  file_label: string;
  size_mb: number;
  created_at: string;
}

export async function getCompanySettings(tenantId: number): Promise<CompanySettings | null> {
  return db.getOne<CompanySettings>(
    `SELECT id, tenant_id, company_name, server_ip, alert_email, log_retention_days, updated_at
     FROM public.company_settings
     WHERE tenant_id = $1`,
    [tenantId]
  );
}

export async function upsertCompanySettings(
  tenantId: number,
  input: Partial<Omit<CompanySettings, "id" | "tenant_id" | "updated_at">>
): Promise<CompanySettings> {
  const row = await db.getOne<CompanySettings>(
    `INSERT INTO public.company_settings (tenant_id, company_name, server_ip, alert_email, log_retention_days)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       server_ip = EXCLUDED.server_ip,
       alert_email = EXCLUDED.alert_email,
       log_retention_days = EXCLUDED.log_retention_days,
       updated_at = NOW()
     RETURNING id, tenant_id, company_name, server_ip, alert_email, log_retention_days, updated_at`,
    [
      tenantId,
      input.company_name ?? "Cyber Link Communication",
      input.server_ip ?? "",
      input.alert_email ?? "",
      input.log_retention_days ?? 90,
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
