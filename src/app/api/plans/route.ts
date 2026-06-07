import { NextResponse } from "next/server";
import { listPlans } from "@/services/tenant.service";

export async function GET() {
  try {
    const plans = await listPlans();
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch plans", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
