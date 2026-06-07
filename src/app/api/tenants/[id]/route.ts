import { getTenantById, updateTenantStatus } from "@/services/tenant.service";
import { countTenantSyslogs } from "@/services/syslog.service";
import { countTenantDevices } from "@/services/device.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("TENANT_READ");
  if (error) return error;

  try {
    const { id } = await params;
    const tenantId = Number(id);
    if (Number.isNaN(tenantId)) {
      return apiError("Invalid tenant id", 400);
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return apiError("Tenant not found", 404);
    }

    const [logCount, deviceCount] = await Promise.all([
      countTenantSyslogs(tenant.schema_name),
      countTenantDevices(tenant.schema_name),
    ]);

    return NextResponse.json({
      ...tenant,
      log_count: logCount,
      device_count: deviceCount,
    });
  } catch (err) {
    return apiError(
      "Failed to fetch tenant",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("TENANT_UPDATE");
  if (error) return error;

  try {
    const { id } = await params;
    const tenantId = Number(id);
    if (Number.isNaN(tenantId)) {
      return apiError("Invalid tenant id", 400);
    }

    const body = await request.json();
    const tenant = await updateTenantStatus(tenantId, body.status);
    if (!tenant) {
      return apiError("Tenant not found", 404);
    }

    return NextResponse.json(tenant);
  } catch (err) {
    return apiError(
      "Update failed",
      400,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
