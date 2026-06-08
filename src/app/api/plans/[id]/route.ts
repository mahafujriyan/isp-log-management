import { deletePlan, getPlanById, updatePlan } from "@/services/plan.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  const { error } = await requirePermission("PLAN_MANAGE");
  if (error) return error;

  const id = Number((await params).id);
  if (!Number.isFinite(id) || id < 1) {
    return apiError("Invalid plan id", 400);
  }

  try {
    const body = await request.json();
    const plan = await updatePlan(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      price_bdt: body.price_bdt !== undefined ? Number(body.price_bdt) : undefined,
      max_users: body.max_users !== undefined ? Number(body.max_users) : undefined,
      max_devices: body.max_devices !== undefined ? Number(body.max_devices) : undefined,
      retention_days: body.retention_days !== undefined ? Number(body.retention_days) : undefined,
      max_logs_per_day: body.max_logs_per_day !== undefined ? Number(body.max_logs_per_day) : undefined,
      is_featured: body.is_featured !== undefined ? Boolean(body.is_featured) : undefined,
    });

    if (!plan) return apiError("Plan not found", 404);
    return NextResponse.json(plan);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    if (mapped.status !== 500 && mapped.status !== 503) {
      return apiError("Update failed", 400, err instanceof Error ? err.message : "Unknown");
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { error } = await requirePermission("PLAN_MANAGE");
  if (error) return error;

  const id = Number((await params).id);
  if (!Number.isFinite(id) || id < 1) {
    return apiError("Invalid plan id", 400);
  }

  const existing = await getPlanById(id);
  if (!existing) return apiError("Plan not found", 404);

  try {
    await deletePlan(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(
      "Delete failed",
      400,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
