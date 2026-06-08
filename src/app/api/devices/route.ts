import { createTenantDevice, resolveDevicesQuery } from "@/services/device.service";
import { getTenantById } from "@/services/tenant.service";
import { apiError, requirePermission, resolveTenantScope } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error } = await requirePermission("DEVICE_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const requested = tenantIdParam ? Number(tenantIdParam) : undefined;
  const scope = await resolveTenantScope(
    requested && !Number.isNaN(requested) ? requested : undefined
  );
  if (scope.error) return scope.error;

  const schema = searchParams.get("schema") ?? undefined;
  const disabled = searchParams.get("disabled") === "true";

  try {
    const { devices, schema_name, source } = await resolveDevicesQuery({
      tenant_id: scope.tenant_id,
      schema,
      disabled,
    });

    return NextResponse.json({ devices, count: devices.length, source, schema_name });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission("DEVICE_WRITE");
  if (error) return error;

  try {
    const body = await request.json();
    const tenantId = Number(body.tenant_id ?? 1);

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return apiError("Tenant not found", 404);
    }

    const device = await createTenantDevice(tenant.schema_name, {
      name: body.name,
      device_ip: body.device_ip ?? body.ip,
      config_type: body.config_type ?? body.config,
      nat_ip: body.nat_ip,
      syslog_user: body.syslog_user ?? body.user,
      syslog_port: body.syslog_port ?? body.port,
      listen_port: body.listen_port,
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    return apiError(
      "Creation failed",
      400,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
