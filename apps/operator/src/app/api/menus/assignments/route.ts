import {
  assignMenuToRole,
  listRoleMenuAssignments,
} from "@isp/core/services/menu.service";
import { apiError, rejectDemoWrite, requirePermission } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { isAppRole } from "@isp/core/utils/rbac.utils";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requirePermission("MENU_MANAGE");
  if (error) return error;

  try {
    const assignments = await listRoleMenuAssignments();
    return NextResponse.json(assignments);
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const writeBlock = await rejectDemoWrite();
  if (writeBlock) return writeBlock;

  const { error } = await requirePermission("MENU_MANAGE");
  if (error) return error;

  try {
    const body = await request.json();
    const role = String(body.role ?? "").trim();
    const menuId = Number(body.menu_id);

    if (!isAppRole(role) || !Number.isFinite(menuId)) {
      return apiError("Validation failed", 400, "Valid role and menu_id are required");
    }

    const assignment = await assignMenuToRole({ role, menu_id: menuId });
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
