import { auth } from "@/auth";
import { createTenant, listTenants } from "@/services/tenant.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tenants = await listTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tenants", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || (role !== "super_admin" && role !== "operator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    return NextResponse.json(
      { error: "Creation failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 400 }
    );
  }
}
