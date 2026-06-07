import { NextResponse } from "next/server";
import { apiError, canIngestLogs, parsePositiveInt, requirePermission } from "@/utils/api.utils";
import { ingestLogs, resolveLogsQuery } from "@/services/syslog.service";
import type { IngestLogsInput } from "@/types";

export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = parsePositiveInt(searchParams.get("limit"), 100, 500);
  const user = searchParams.get("user") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const schema = searchParams.get("schema") ?? undefined;
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const tenant_id = tenantIdParam ? Number(tenantIdParam) : undefined;
  const format = searchParams.get("format");

  try {
    const { logs, source, schema_name } = await resolveLogsQuery({
      tenant_id: tenant_id && !Number.isNaN(tenant_id) ? tenant_id : undefined,
      schema,
      limit,
      from,
      to,
      user,
    });

    if (format === "raw") {
      return NextResponse.json(logs);
    }

    return NextResponse.json({
      logs,
      count: logs.length,
      source,
      schema_name,
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
