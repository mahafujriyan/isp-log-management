import { NextResponse } from "next/server";
import { listPlans } from "@/services/tenant.service";
import { mapDatabaseError } from "@/utils/db-error.utils";

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json(plans);
  } catch (error) {
    const mapped = mapDatabaseError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
