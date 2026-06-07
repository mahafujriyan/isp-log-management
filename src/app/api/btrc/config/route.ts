import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadBtrcConfig, saveBtrcConfig } from "@/lib/btrc-service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await loadBtrcConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user?.role;
  if (role !== "super_admin" && role !== "operator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const saved = await saveBtrcConfig({
      isp_license: body.isp_license,
      isp_name: body.isp_name,
      api_url: body.api_url ?? "",
      auto_submit: Boolean(body.auto_submit),
      submit_interval_hours: Number(body.submit_interval_hours ?? 24),
      retention_days: Number(body.retention_days ?? 180),
      timezone: body.timezone ?? "Asia/Dhaka",
      contact_email: body.contact_email ?? "",
    });
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "Failed to save config" }, { status: 400 });
  }
}
