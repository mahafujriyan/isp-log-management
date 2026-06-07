import { NextResponse } from "next/server";
import { auth } from "@/services/auth.service";
import { exportBtrcData } from "@/services/btrc.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 500), 5000);

  const { contentType, body, records } = await exportBtrcData(format, from, to, limit);
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === "csv" ? "csv" : "json";

  return new NextResponse(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="btrc-nat-logs-${date}.${ext}"`,
      "X-Record-Count": String(records.length),
    },
  });
}
