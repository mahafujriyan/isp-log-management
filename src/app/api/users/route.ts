import { listUsers } from "@/services/user.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("USERS_READ");
  if (error) return error;

  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err) {
    return apiError(
      "Failed to fetch users",
      500,
      err instanceof Error ? err.message : "Unknown"
    );
  }
}
