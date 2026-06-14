import { listDemoRequests } from "@isp/core/services/demo-request.service";
import { requirePermission } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { error } = await requirePermission("DEMO_REQUEST_MANAGE");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  try {
    const rows = await listDemoRequests(status);
    return NextResponse.json(rows);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
