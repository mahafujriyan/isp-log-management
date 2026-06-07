import { NextResponse } from "next/server";
import { getLiveDashboardMetrics } from "@/services/dashboard.service";
import { apiError, parsePositiveInt, requirePermission } from "@/utils/api.utils";

export async function GET(request: Request) {
  const { error } = await requirePermission("LOGS_READ");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId");
  const tenant_id = tenantIdParam ? parsePositiveInt(tenantIdParam, 0) : undefined;

  try {
    const metrics = await getLiveDashboardMetrics(
      tenant_id && tenant_id > 0 ? tenant_id : undefined
    );
    return NextResponse.json(metrics);
  } catch (error) {
    return apiError(
      "Failed to load metrics",
      500,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
