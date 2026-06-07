import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tenants = await db.getMany(
      "SELECT * FROM public.tenants ORDER BY created_at DESC"
    );
    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tenants", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { admin_name, admin_email, plan_id } = await request.json();
    const schema_name = `tenant_${Date.now()}`;

    const result = await db.getOne(
      `INSERT INTO public.tenants (admin_name, admin_email, schema_name, plan_id, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '90 days')
       RETURNING *`,
      [admin_name, admin_email, schema_name, plan_id ?? 1]
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Creation failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 400 }
    );
  }
}
