import { createPlan } from "@/services/plan.service";
import { listPlans } from "@/services/tenant.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json(plans);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
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
