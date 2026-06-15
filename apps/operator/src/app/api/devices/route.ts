import { createTenantDevice, resolveDevicesQuery } from "@isp/core/services/device.service";
import { getTenantById } from "@isp/core/services/tenant.service";
import { apiError, rejectDemoWrite, requirePermission, resolveTenantScope } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
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
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("DEVICE_WRITE");
  if (error) return error;

  try {
    const body = await request.json();
    const requested = Number(body.tenant_id ?? 1);
    const scope = await resolveTenantScope(Number.isFinite(requested) ? requested : undefined);
    if (scope.error) return scope.error;

    const tenantId = scope.tenant_id ?? requested;
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
      api_user: body.api_user ?? body.username,
      api_password: body.api_password ?? body.password,
      api_port: body.api_port != null ? Number(body.api_port) : undefined,
    });

    return NextResponse.json(device, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("required") || message.includes("not found")) {
      return apiError("Creation failed", 400, message);
    }
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
