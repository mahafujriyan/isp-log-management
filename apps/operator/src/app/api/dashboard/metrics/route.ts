import { NextResponse } from "next/server";
import { getLiveDashboardMetrics } from "@isp/core/services/dashboard.service";
import { apiError, parsePositiveInt, requirePermission, resolveTenantScope } from "@isp/core/utils/api.utils";
import { withRequestCache } from "@isp/core/lib/cache/request-cache";

export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const requested = tenantIdParam ? parsePositiveInt(tenantIdParam, 0) : undefined;
  const scope = await resolveTenantScope(requested && requested > 0 ? requested : undefined);
  if (scope.error) return scope.error;

  try {
    const cacheKey = `api:dashboard:metrics:${scope.tenant_id ?? "all"}`;
    const metrics = await withRequestCache(cacheKey, 3, () =>
      getLiveDashboardMetrics(scope.tenant_id)
    );
    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "private, max-age=0, s-maxage=3, stale-while-revalidate=10" },
    });
  } catch (error) {
    return apiError(
      "Failed to load metrics",
      500,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
