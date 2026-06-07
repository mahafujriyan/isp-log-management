import { listTenants, createTenant } from "@/services/tenant.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("TENANT_READ");
  if (error) return error;

  try {
    const tenants = await listTenants();
    return NextResponse.json(tenants);
  } catch (err) {
    return apiError(
      "Database error",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission("TENANT_CREATE");
  if (error) return error;

  try {
    const body = await request.json();
    const tenant = await createTenant({
      admin_name: body.admin_name,
      admin_email: body.admin_email,
      plan_id: Number(body.plan_id ?? 1),
      expires_in_days: body.expires_in_days ? Number(body.expires_in_days) : 90,
    });

    return NextResponse.json(
      {
        ...tenant,
        message: `Tenant created with isolated schema ${tenant.schema_name}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(
      "Creation failed",
      400,
      error instanceof Error ? error.message : "Unknown"
    );
  }
}
