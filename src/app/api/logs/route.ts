import { NextResponse } from "next/server";
import { resolveLogsQuery } from "@/services/syslog.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 500);
  const user = searchParams.get("user") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const schema = searchParams.get("schema") ?? undefined;
  const tenantIdParam = searchParams.get("tenant_id");
  const tenant_id = tenantIdParam ? Number(tenantIdParam) : undefined;

  const { logs, source, schema_name } = await resolveLogsQuery({
    tenant_id: tenant_id && !Number.isNaN(tenant_id) ? tenant_id : undefined,
    schema,
    limit,
    from,
    to,
    user,
  });

  return NextResponse.json({
    logs,
    count: logs.length,
    source,
    schema_name,
  });
}
