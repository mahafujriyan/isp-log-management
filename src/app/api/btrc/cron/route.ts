import { NextResponse } from "next/server";
import { submitBtrcBatch, loadBtrcConfig } from "@/services/btrc.service";

/** Scheduled auto-submit endpoint — protect with CRON_SECRET header */
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await loadBtrcConfig();
  if (!config.auto_submit) {
    return NextResponse.json({ message: "Auto submit disabled" });
  }

  const to = new Date().toISOString();
  const from = new Date(Date.now() - config.submit_interval_hours * 3600000).toISOString();

  const { result, submission } = await submitBtrcBatch(from, to, 5000, "cron");

  return NextResponse.json({
    success: result.success,
    batch_id: submission.batch_id,
    record_count: submission.record_count,
  });
}
