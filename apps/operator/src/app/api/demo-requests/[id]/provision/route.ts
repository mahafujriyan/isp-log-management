import { env } from "@isp/core/config/env.config";
import { provisionDemoFromRequest } from "@isp/core/services/demo-provisioning.service";
import { apiError, requirePermission } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { error } = await requirePermission("DEMO_REQUEST_MANAGE");
  if (error) return error;

  const id = Number((await params).id);
  if (!Number.isFinite(id) || id < 1) {
    return apiError("Invalid request id", 400);
  }

  try {
    const body = await request.json();
    const durationUnit = body.duration_unit === "hours" ? "hours" : "minutes";
    const result = await provisionDemoFromRequest({
      requestId: id,
      password: String(body.password ?? ""),
      durationValue: Number(body.duration_value ?? body.duration ?? 60),
      durationUnit,
      appUrl: env.appUrl,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provision failed";
    if (message.includes("does not exist") || message.includes("42P01")) {
      const mapped = mapDatabaseError(err);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    return apiError("Provision failed", 400, message);
  }
}
