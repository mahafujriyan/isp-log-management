import {
  getCompanySettings,
  getLatestBackup,
  recordBackup,
  upsertCompanySettings,
} from "@/services/company.service";
import { apiError, rejectDemoWrite, requirePermission, resolveTenantScope } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

const DEFAULT_SETTINGS = {
  company_name: "Cyber Link Communication",
  logo_url: "",
  tagline: "",
  server_ip: "",
  alert_email: "",
  support_phone: "",
  website: "",
  address: "",
  timezone: "Asia/Dhaka",
  log_retention_days: 90,
};

export async function GET(request: Request) {
  const { error } = await requirePermission("COMPANY_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("tenant_id") ?? 1);
  const scope = await resolveTenantScope(requested);
  if (scope.error) return scope.error;
  const tenantId = scope.tenant_id ?? requested;

  try {
    const [settings, backup] = await Promise.all([
      getCompanySettings(tenantId),
      getLatestBackup(tenantId),
    ]);
    return NextResponse.json({
      settings: settings ?? { ...DEFAULT_SETTINGS, tenant_id: tenantId },
      lastBackup: backup,
    });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function PUT(request: Request) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("COMPANY_WRITE");
  if (error) return error;

  try {
    const body = await request.json();
    const requested = Number(body.tenant_id ?? 1);
    const scope = await resolveTenantScope(requested);
    if (scope.error) return scope.error;
    const tenantId = scope.tenant_id ?? requested;

    if (body.logo_url && String(body.logo_url).length > 2000) {
      return apiError("Invalid logo URL. Upload the image using the logo upload button.", 400);
    }

    const settings = await upsertCompanySettings(tenantId, {
      company_name: body.company_name,
      logo_url: body.logo_url,
      tagline: body.tagline,
      server_ip: body.server_ip,
      alert_email: body.alert_email,
      support_phone: body.support_phone,
      website: body.website,
      address: body.address,
      timezone: body.timezone,
      log_retention_days: body.log_retention_days != null ? Number(body.log_retention_days) : undefined,
    });
    return NextResponse.json(settings);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("COMPANY_WRITE");
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const requested = Number(body.tenant_id ?? 1);
    const scope = await resolveTenantScope(requested);
    if (scope.error) return scope.error;
    const tenantId = scope.tenant_id ?? requested;

    const backup = await recordBackup(tenantId);
    return NextResponse.json(backup, { status: 201 });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
