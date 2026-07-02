import { db } from "@isp/core/lib/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const noStore = { "Cache-Control": "no-store" };
  try {
    await db.query("SELECT 1");
    // Never leak internal timestamps/versions/errors to unauthenticated callers.
    return NextResponse.json({ status: "ok" }, { headers: noStore });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503, headers: noStore });
  }
}
