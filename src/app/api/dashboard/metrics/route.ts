import { NextResponse } from "next/server";
import { getLiveDashboardMetrics } from "@/services/dashboard.service";
import { apiError, parsePositiveInt, requirePermission, resolveTenantScope } from "@/utils/api.utils";

export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const requested = tenantIdParam ? parsePositiveInt(tenantIdParam, 0) : undefined;
  const scope = await resolveTenantScope(requested && requested > 0 ? requested : undefined);
  if (scope.error) return scope.error;

  try {
    const metrics = await getLiveDashboardMetrics(scope.tenant_id);
    return NextResponse.json(metrics);
  } catch (error) {
    return apiError(
      "Failed to load metrics",
      500,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
