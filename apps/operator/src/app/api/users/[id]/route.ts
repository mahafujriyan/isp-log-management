import { deleteUser, getUserById, updateUser } from "@isp/core/services/user.service";
import { apiError, rejectDemoWrite, requirePermission } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { isAppRole } from "@isp/core/utils/rbac.utils";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("USER_WRITE");
  if (error) return error;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return apiError("Invalid user id", 400);

  try {
    const body = await request.json();
    const role = body.role != null ? String(body.role) : undefined;
    if (role && !isAppRole(role)) return apiError("Invalid role", 400);

    const user = await updateUser(userId, {
      username: body.username,
      email: body.email,
      password: body.password,
      role: role as never,
      is_active: body.is_active,
    });
    return NextResponse.json(user);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("USER_WRITE");
  if (error) return error;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return apiError("Invalid user id", 400);

  try {
    const existing = await getUserById(userId);
    if (!existing) return apiError("User not found", 404);
    await deleteUser(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
