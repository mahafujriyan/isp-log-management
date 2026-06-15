import { NextResponse } from "next/server";
import { db } from "@isp/core/lib/database";
import { apiError, parsePositiveInt, requirePermission, resolveTenantScope } from "@isp/core/utils/api.utils";
import { getTenantById, syslogToLogEntry } from "@isp/core/services/tenant.service";
import type { SyslogEntry } from "@isp/core/types";
import { assertValidTenantSchema } from "@isp/core/utils/schema.utils";

/**
 * GET /api/logs/user/:username?from=&to=&limit=
 * All session logs for a PPPoE subscriber.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { username } = await context.params;
  const decoded = decodeURIComponent(username).trim();
  if (!decoded) return apiError("username is required", 400);

  const { searchParams } = new URL(request.url);
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
    return apiError("tenant_id is required", 400);
  }

  const tenant = await getTenantById(scope.tenant_id);
  if (!tenant) return apiError("Tenant not found", 404);

  const schema = assertValidTenantSchema(tenant.schema_name);
  const params: unknown[] = [decoded];
  let sql = `
    SELECT id, log_time AS received_at, pppoe_user, mac_address,
           host(user_ip) AS user_ip, user_port,
           host(nat_ip) AS nat_ip, nat_port,
           host(visited_ip) AS visited_ip, visited_port,
           protocol, NULL::char(2) AS country_code, NULL::varchar AS city, raw_message
    FROM "${schema}".session_logs
    WHERE LOWER(pppoe_user) = LOWER($1)
  `;

  if (from) {
    params.push(from);
    sql += ` AND log_time >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    sql += ` AND log_time <= $${params.length}`;
  }

  params.push(limit);
  sql += ` ORDER BY log_time DESC LIMIT $${params.length}`;

  try {
    const [logs, profile] = await Promise.all([
      db.getMany<SyslogEntry>(sql, params),
      db.getOne<{
        username: string;
        mac_address: string | null;
        last_private_ip: string | null;
        last_public_ip: string | null;
        session_count: number;
        first_seen_at: string;
        last_seen_at: string;
        status: string;
      }>(
        `SELECT username, mac_address,
                host(last_private_ip) AS last_private_ip,
                host(last_public_ip) AS last_public_ip,
                session_count, first_seen_at, last_seen_at, status
         FROM "${schema}".pppoe_users
         WHERE LOWER(username) = LOWER($1)`,
        [decoded]
      ),
    ]);

    return NextResponse.json({
      username: decoded,
      profile,
      logs: logs.map(syslogToLogEntry),
      count: logs.length,
      schema_name: schema,
    });
  } catch (err) {
    return apiError(
      "User log query failed",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
