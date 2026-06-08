import {
  assignMenuToRole,
  listRoleMenuAssignments,
} from "@/services/menu.service";
import { apiError, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { isAppRole } from "@/utils/rbac.utils";
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
