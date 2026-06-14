import { createPlan } from "@isp/core/services/plan.service";
import { listPlans } from "@isp/core/services/tenant.service";
import { apiError, requirePermission } from "@isp/core/utils/api.utils";
import { corsHeaders, handleCorsPreflight, jsonWithCors } from "@isp/core/utils/cors.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

export async function GET(request: Request) {
  try {
    const plans = await listPlans();
    return jsonWithCors(request, plans);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    return NextResponse.json(mapped.body, {
      status: mapped.status,
      headers: corsHeaders(request),
    });
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission("PLAN_MANAGE");
  if (error) return error;

  try {
    const body = await request.json();
    const plan = await createPlan({
      name: String(body.name ?? ""),
      price_bdt: Number(body.price_bdt ?? 0),
      max_users: Number(body.max_users ?? 5),
      max_devices: Number(body.max_devices ?? 2),
      retention_days: Number(body.retention_days ?? 30),
      max_logs_per_day: Number(body.max_logs_per_day ?? 500000),
      is_featured: Boolean(body.is_featured),
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    return apiError(
      "Create failed",
      400,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
