import { createUser, listUsers } from "@/services/user.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { isAppRole } from "@/utils/rbac.utils";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("USERS_READ");
  if (error) return error;

  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const { error } = await requirePermission("USER_WRITE");
  if (error) return error;

  try {
    const body = await request.json();
    const role = String(body.role ?? "viewer");
    if (!isAppRole(role)) {
      return apiError("Invalid role", 400);
    }

    const user = await createUser({
      username: body.username,
      email: body.email,
      password: body.password,
      role,
      tenant_id: body.tenant_id != null ? Number(body.tenant_id) : null,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
