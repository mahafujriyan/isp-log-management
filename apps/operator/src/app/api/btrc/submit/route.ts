import { NextResponse } from "next/server";
import { submitBtrcBatch } from "@isp/core/services/btrc.service";
import { apiError, requirePermission } from "@isp/core/utils/api.utils";

export async function POST(request: Request) {
  const { session, error } = await requirePermission("BTRC_MANAGE");
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const from = body.from as string | undefined;
    const to = body.to as string | undefined;
    const limit = Math.min(Number(body.limit ?? 500), 5000);

    const { result, submission } = await submitBtrcBatch(
      from,
      to,
      limit,
      session?.user?.email ?? session?.user?.name ?? "operator"
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
  } catch (err) {
    return apiError(
      "Submission failed",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
