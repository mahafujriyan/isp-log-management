import { NextResponse } from "next/server";
import { requirePermission, resolveTenantScope, parsePositiveInt } from "@isp/core/utils/api.utils";
import { getRecentSecurityAlerts } from "@isp/core/services/security-events.service";
import { ROLES } from "@isp/core/constants/roles.constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { session, error } = await requirePermission("SECURITY_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const requested = tenantIdParam ? Number(tenantIdParam) : undefined;
  const scope = await resolveTenantScope(
    requested && !Number.isNaN(requested) ? requested : undefined
  );
  if (scope.error) return scope.error;

  const isSuperAdmin = session?.user?.role === ROLES.SUPER_ADMIN;
  const limit = parsePositiveInt(searchParams.get("limit"), 50, 200);
  const sinceMinutes = parsePositiveInt(searchParams.get("since_minutes"), 1440, 60 * 24 * 7);

  const alerts = await getRecentSecurityAlerts({
    tenantId: scope.tenant_id ?? null,
    isSuperAdmin,
    limit,
    sinceMinutes,
    severities: ["critical", "warning"],
  });

  return NextResponse.json(
    { alerts, count: alerts.length },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
