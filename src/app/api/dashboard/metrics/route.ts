import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/services/mock-data.service";

export async function GET() {
  return NextResponse.json(getDashboardMetrics());
}
