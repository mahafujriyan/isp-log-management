import { recheckTenantDevices } from "@/services/device.service";
import { getTenantById } from "@/services/tenant.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { error } = await requirePermission("DEVICE_WRITE");
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const tenantId = Number(body.tenant_id ?? 1);
    const tenant = await getTenantById(tenantId);
    if (!tenant) return apiError("Tenant not found", 404);

    const updated = await recheckTenantDevices(tenant.schema_name);
    return NextResponse.json({ updated, schema_name: tenant.schema_name });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
