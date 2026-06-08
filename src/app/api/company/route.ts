import {
  getCompanySettings,
  getLatestBackup,
  recordBackup,
  upsertCompanySettings,
} from "@/services/company.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error } = await requirePermission("COMPANY_MANAGE");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantId = Number(searchParams.get("tenant_id") ?? 1);

  try {
    const [settings, backup] = await Promise.all([
      getCompanySettings(tenantId),
      getLatestBackup(tenantId),
    ]);
    return NextResponse.json({ settings, lastBackup: backup });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function PUT(request: Request) {
  const { error } = await requirePermission("COMPANY_MANAGE");
  if (error) return error;

  try {
    const body = await request.json();
    const tenantId = Number(body.tenant_id ?? 1);
    const settings = await upsertCompanySettings(tenantId, {
      company_name: body.company_name,
      server_ip: body.server_ip,
      alert_email: body.alert_email,
      log_retention_days: body.log_retention_days != null ? Number(body.log_retention_days) : undefined,
    });
    return NextResponse.json(settings);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission("COMPANY_MANAGE");
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = Number(body.tenant_id ?? 1);
    const backup = await recordBackup(tenantId);
    return NextResponse.json(backup, { status: 201 });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
