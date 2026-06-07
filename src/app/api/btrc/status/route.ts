import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getComplianceStatus, getSubmissionHistory } from "@/services/btrc.service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [status, submissions] = await Promise.all([
    getComplianceStatus(),
    getSubmissionHistory(15),
  ]);

  return NextResponse.json({ status, submissions });
}
