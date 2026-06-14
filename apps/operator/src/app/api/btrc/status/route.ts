import { NextResponse } from "next/server";
import { getComplianceStatus, getSubmissionHistory } from "@isp/core/services/btrc.service";
import { requirePermission } from "@isp/core/utils/api.utils";

export async function GET() {
  const { error } = await requirePermission("BTRC_MANAGE");
  if (error) return error;

  const [status, submissions] = await Promise.all([
    getComplianceStatus(),
    getSubmissionHistory(15),
  ]);

  return NextResponse.json({ status, submissions });
}
