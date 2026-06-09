import { NextResponse } from "next/server";
import { db } from "@/lib/database";
import { apiError, parsePositiveInt, requirePermission, resolveTenantScope } from "@/utils/api.utils";
import { getTenantById } from "@/services/tenant.service";
import { syslogToLogEntry } from "@/services/tenant.service";
import type { SyslogEntry } from "@/types";
import { assertValidTenantSchema } from "@/utils/schema.utils";

/**
 * GET /api/logs/search?q=&mac=&ip=&protocol=&from=&to=&limit=
 * Full-text style search across session_logs + syslogs.
 */
export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const mac = searchParams.get("mac")?.trim() ?? "";
  const ip = searchParams.get("ip")?.trim() ?? "";
  const protocol = searchParams.get("protocol")?.trim() ?? "";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = parsePositiveInt(searchParams.get("limit"), 100, 500);

  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const requested = tenantIdParam ? Number(tenantIdParam) : undefined;
  const scope = await resolveTenantScope(
    requested && !Number.isNaN(requested) ? requested : undefined
  );
  if (scope.error) return scope.error;

  if (!scope.tenant_id) {
    return apiError("tenant_id is required for search", 400);
  }

  const tenant = await getTenantById(scope.tenant_id);
  if (!tenant) return apiError("Tenant not found", 404);

  const schema = assertValidTenantSchema(tenant.schema_name);
  const params: unknown[] = [];
  let sql = `
    SELECT id, log_time AS received_at, pppoe_user, mac_address,
           host(user_ip) AS user_ip, user_port,
           host(nat_ip) AS nat_ip, nat_port,
           host(visited_ip) AS visited_ip, visited_port,
           protocol, NULL::char(2) AS country_code, NULL::varchar AS city, raw_message
    FROM "${schema}".session_logs
    WHERE 1=1
  `;

  if (from) {
    params.push(from);
    sql += ` AND log_time >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    sql += ` AND log_time <= $${params.length}`;
  }
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (
      LOWER(pppoe_user) LIKE LOWER($${params.length})
      OR LOWER(raw_message) LIKE LOWER($${params.length})
      OR host(visited_ip) LIKE $${params.length}
      OR host(user_ip) LIKE $${params.length}
    )`;
  }
  if (mac) {
    params.push(`%${mac.replace(/[:-]/g, "")}%`);
    sql += ` AND REPLACE(REPLACE(UPPER(mac_address), ':', ''), '-', '') LIKE UPPER($${params.length})`;
  }
  if (ip) {
    params.push(`%${ip}%`);
    sql += ` AND (host(user_ip) LIKE $${params.length} OR host(nat_ip) LIKE $${params.length} OR host(visited_ip) LIKE $${params.length})`;
  }
  if (protocol) {
    params.push(protocol.toUpperCase());
    sql += ` AND UPPER(protocol) = $${params.length}`;
  }

  params.push(limit);
  sql += ` ORDER BY log_time DESC LIMIT $${params.length}`;

  try {
    const rows = await db.getMany<SyslogEntry>(sql, params);
    const logs = rows.map(syslogToLogEntry);
    return NextResponse.json({
      logs,
      count: logs.length,
      schema_name: schema,
      source: "session_logs",
    });
  } catch (err) {
    return apiError(
      "Search failed",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
