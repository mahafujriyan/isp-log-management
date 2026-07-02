import { NextResponse } from "next/server";
import { getVisibleMetricsWithData } from "@isp/core/services/metrics.service";
import { apiError, parsePositiveInt, requirePermission, resolveTenantScope } from "@isp/core/utils/api.utils";
import { withRequestCache } from "@isp/core/lib/cache/request-cache";

export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId") ?? "1";
  const requested = parsePositiveInt(tenantIdParam, 1);
  const scope = await resolveTenantScope(requested);
  if (scope.error) return scope.error;
  const tenantId = scope.tenant_id ?? requested;
  const range = searchParams.get("range") ?? "24h";

  try {
    const cacheKey = `api:metrics:${tenantId}:${range}`;
    const metrics = await withRequestCache(cacheKey, 5, () =>
      getVisibleMetricsWithData(tenantId, range)
    );
    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "private, max-age=0, s-maxage=5, stale-while-revalidate=15" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    if (message.includes("tenant_metric_settings") || message.includes("public.metrics")) {
      return apiError(
        "Metrics tables not found — run: npm run db:phase8",
        503,
        message
      );
    }
    return apiError("Failed to fetch metrics", 500, message);
  }
}
