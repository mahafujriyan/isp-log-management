import { NextResponse } from "next/server";
import { toggleMetricVisibility, updateMetricSetting } from "@isp/core/services/metrics.service";
import { apiError, parsePositiveInt, requirePermission } from "@isp/core/utils/api.utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("ADMIN_PANEL");
  if (error) return error;

  try {
    const { id } = await params;
    const metricId = Number(id);
    if (Number.isNaN(metricId)) return apiError("Invalid metric id", 400);

    const body = await request.json();
    const tenantId = parsePositiveInt(String(body.tenantId ?? body.tenant_id ?? 1), 1);
    const isVisible = body.isVisible ?? body.is_visible ?? true;

    await toggleMetricVisibility(tenantId, metricId, Boolean(isVisible));
    return NextResponse.json({ ok: true, metricId, tenantId, is_visible: Boolean(isVisible) });
  } catch (err) {
    return apiError(
      "Toggle failed",
      400,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("ADMIN_PANEL");
  if (error) return error;

  try {
    const { id } = await params;
    const metricId = Number(id);
    if (Number.isNaN(metricId)) return apiError("Invalid metric id", 400);

    const body = await request.json();
    const tenantId = parsePositiveInt(String(body.tenantId ?? body.tenant_id ?? 1), 1);

    await updateMetricSetting(tenantId, metricId, {
      position: body.position,
      chart_size: body.chart_size,
      refresh_interval: body.refresh_interval,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(
      "Update failed",
      400,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
