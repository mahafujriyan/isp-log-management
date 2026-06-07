import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(getDashboardMetrics());
}
