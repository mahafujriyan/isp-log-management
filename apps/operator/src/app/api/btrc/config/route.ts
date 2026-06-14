import { NextResponse } from "next/server";
import { loadBtrcConfig, saveBtrcConfig } from "@isp/core/services/btrc.service";
import { apiError, requirePermission } from "@isp/core/utils/api.utils";

export async function GET() {
  const { error } = await requirePermission("BTRC_MANAGE");
  if (error) return error;

  const config = await loadBtrcConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const { error } = await requirePermission("BTRC_MANAGE");
  if (error) return error;

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
    return apiError("Failed to save config", 400);
  }
}
