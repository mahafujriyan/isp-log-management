import {
  deleteTenantDevice,
  updateTenantDevice,
} from "@/services/device.service";
import { getTenantById } from "@/services/tenant.service";
import { apiError, rejectDemoWrite, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("DEVICE_WRITE");
  if (error) return error;

  const { id } = await params;
  const deviceId = Number(id);
  if (!Number.isFinite(deviceId)) return apiError("Invalid device id", 400);

  try {
    const body = await request.json();
    const tenantId = Number(body.tenant_id ?? 1);
    const tenant = await getTenantById(tenantId);
    if (!tenant) return apiError("Tenant not found", 404);

    const device = await updateTenantDevice(tenant.schema_name, deviceId, {
      name: body.name,
      device_ip: body.device_ip ?? body.ip,
      config_type: body.config_type ?? body.config,
      nat_ip: body.nat_ip,
      syslog_user: body.syslog_user ?? body.user,
      syslog_port: body.syslog_port ?? body.port,
      listen_port: body.listen_port,
      status: body.status,
    });

    return NextResponse.json(device);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("DEVICE_WRITE");
  if (error) return error;

  const { id } = await params;
  const deviceId = Number(id);
  if (!Number.isFinite(deviceId)) return apiError("Invalid device id", 400);

  const { searchParams } = new URL(request.url);
  const tenantId = Number(searchParams.get("tenant_id") ?? 1);

  try {
    const tenant = await getTenantById(tenantId);
    if (!tenant) return apiError("Tenant not found", 404);

    const deleted = await deleteTenantDevice(tenant.schema_name, deviceId);
    if (!deleted) return apiError("Device not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
