import { expireDemoAccounts } from "@isp/core/services/demo-provisioning.service";
import { NextResponse } from "next/server";

/** Deactivate expired demo users — protect with CRON_SECRET header */
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireDemoAccounts();
    return NextResponse.json({
      ok: true,
      deactivated_users: result.users,
      expired_requests: result.requests,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Expiry job failed",
        detail: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
