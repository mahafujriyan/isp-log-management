import { getTenantById } from "@/services/tenant.service";
import { countTenantSyslogs } from "@/services/syslog.service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = Number(id);
    if (Number.isNaN(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const logCount = await countTenantSyslogs(tenant.schema_name);

    return NextResponse.json({ ...tenant, log_count: logCount });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tenant", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
