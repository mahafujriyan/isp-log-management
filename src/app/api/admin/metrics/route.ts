import { NextResponse } from "next/server";
import { listAdminMetrics } from "@/services/metrics.service";
import { apiError, parsePositiveInt, requirePermission } from "@/utils/api.utils";

export async function GET(request: Request) {
  const { error } = await requirePermission("ADMIN_PANEL");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenant_id") ?? searchParams.get("tenantId") ?? "1";
  const tenantId = parsePositiveInt(tenantIdParam, 1);

  try {
    const metrics = await listAdminMetrics(tenantId);
    return NextResponse.json(metrics);
  } catch (err) {
    return apiError(
      "Failed to fetch metric configuration",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
