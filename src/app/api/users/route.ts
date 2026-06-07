import { db } from "@/lib/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = await db.getMany(
      "SELECT id, tenant_id, username, email, role, is_active, created_at FROM public.users ORDER BY created_at DESC"
    );
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
