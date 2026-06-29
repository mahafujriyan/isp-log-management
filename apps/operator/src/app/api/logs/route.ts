import { NextResponse } from "next/server";
import { apiError, canIngestLogs, parsePositiveInt, requirePermission, resolveTenantScope } from "@isp/core/utils/api.utils";
import { ingestLogs, resolveLogsQuery, getTenantLogTableCounts, resolveDefaultTenant } from "@isp/core/services/syslog.service";
import { resolveDeviceRouterId } from "@isp/core/services/device.service";
import { getTenantById } from "@isp/core/services/tenant.service";
import type { IngestLogsInput } from "@isp/core/types";

export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = parsePositiveInt(searchParams.get("limit"), 100, 500);
  const user = searchParams.get("user") ?? undefined;
  const mac = searchParams.get("mac") ?? undefined;
  const natIp = searchParams.get("nat_ip") ?? searchParams.get("device") ?? undefined;
  const deviceIdParam = searchParams.get("device_id");
  const deviceId = deviceIdParam ? Number(deviceIdParam) : undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const schema = searchParams.get("schema") ?? undefined;
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const requested = tenantIdParam ? Number(tenantIdParam) : undefined;
  const scope = await resolveTenantScope(
    requested && !Number.isNaN(requested) ? requested : undefined
  );
  if (scope.error) return scope.error;

  let tenantId = scope.tenant_id ?? requested;
  if (!tenantId || Number.isNaN(tenantId)) {
    const defaultTenant = await resolveDefaultTenant();
    tenantId = defaultTenant?.id;
  }

  try {
    const tenantRow = tenantId ? await getTenantById(tenantId) : null;
    const lookupSchema =
      schema ?? tenantRow?.schema_name ?? process.env.DEFAULT_TENANT_SCHEMA ?? "tenant_001";

    let routerId: number | undefined;
    if (deviceId && !Number.isNaN(deviceId)) {
      const resolved = await resolveDeviceRouterId(lookupSchema, deviceId);
      if (resolved) routerId = resolved;
    }

    const { logs, source, schema_name } = await resolveLogsQuery({
      tenant_id: tenantId,
      schema: lookupSchema,
      limit,
      from,
      to,
      user,
      mac,
      nat_ip: routerId ? undefined : natIp,
      router_id: routerId,
    });

    const tableCounts = schema_name ? await getTenantLogTableCounts(schema_name) : null;
    const totalInDb = tableCounts?.total ?? 0;

    const format = searchParams.get("format");
    if (format === "raw") {
      return NextResponse.json(logs);
    }

    return NextResponse.json({
      logs,
      count: logs.length,
      total_in_db: totalInDb,
      session_logs_in_db: tableCounts?.session_logs ?? 0,
      syslogs_in_db: tableCounts?.syslogs ?? 0,
      source,
      schema_name,
      tenant_id: tenantId,
      hint:
        logs.length === 0 && totalInDb > 0
          ? "Logs exist in DB — device NAT filter removed mismatch; select All devices or refresh"
          : logs.length === 0
            ? "No rows in session_logs or syslogs — verify MikroTik ingest and db:migrate"
            : undefined,
      active_filters: {
        device_id: deviceId && !Number.isNaN(deviceId) ? deviceId : null,
        router_id: routerId ?? null,
        nat_ip: routerId ? null : natIp ?? null,
        from: from ?? null,
        to: to ?? null,
      },
    });
  } catch (error) {
    return apiError(
      "Query failed",
      500,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}

export async function POST(request: Request) {
  const access = await canIngestLogs(request);
  if (!access.allowed) {
    return apiError("Forbidden — sign in or provide x-ingest-secret header", 403);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const payload: IngestLogsInput = {
      tenant_id: body.tenant_id != null ? Number(body.tenant_id) : undefined,
      schema: typeof body.schema === "string" ? body.schema : undefined,
      logs: Array.isArray(body.logs)
        ? (body.logs as IngestLogsInput["logs"])
        : [
            {
              pppoe_user: body.pppoe_user as string | undefined,
              mac: body.mac as string | undefined,
              mac_address: body.mac_address as string | undefined,
              user_ip: body.user_ip as string | undefined,
              nat_ip: body.nat_ip as string | undefined,
              visited_ip: body.visited_ip as string | undefined,
              port: body.port as number | undefined,
              visited_port: body.visited_port as number | undefined,
              nat_port: body.nat_port as number | undefined,
              user_port: body.user_port as number | undefined,
              protocol: body.protocol as string | undefined,
              raw_message: body.raw_message as string | undefined,
            },
          ],
    };

    const first = payload.logs?.[0];
    if (first?.raw_message && !first.pppoe_user && !first.user_ip) {
      const { receiveSyslogBatch } = await import("@isp/core/services/syslog-ingest.service");
      const batch = await receiveSyslogBatch(
        (payload.logs ?? []).map((log) => ({
          raw_message: log.raw_message ?? "",
          tenant_id: payload.tenant_id,
          schema: payload.schema,
        }))
      );
      return NextResponse.json(
        { inserted: batch.inserted, schema_name: payload.schema, mode: "parsed_syslog" },
        { status: 201 }
      );
    }

    const result = await ingestLogs(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(
      "Ingest failed",
      400,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
