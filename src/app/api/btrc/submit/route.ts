import { NextResponse } from "next/server";
import { auth } from "@/services/auth.service";
import { submitBtrcBatch } from "@/services/btrc.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user?.role;
  if (role !== "super_admin" && role !== "operator") {
    return NextResponse.json({ error: "Forbidden — operator or super admin required" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const from = body.from as string | undefined;
    const to = body.to as string | undefined;
    const limit = Math.min(Number(body.limit ?? 500), 5000);

    const { result, submission } = await submitBtrcBatch(
      from,
      to,
      limit,
      session.user?.email ?? session.user?.name ?? "operator"
    );

    return NextResponse.json({
      success: result.success,
      simulated: result.simulated,
      message: result.message,
      batch_id: submission.batch_id,
      record_count: submission.record_count,
      status: submission.status,
      submitted_at: submission.submitted_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Submission failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
