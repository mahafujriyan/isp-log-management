import { deleteMenu } from "@isp/core/services/menu.service";
import { apiError, requirePermission } from "@isp/core/utils/api.utils";
import { mapDatabaseError } from "@isp/core/utils/db-error.utils";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("MENU_MANAGE");
  if (error) return error;

  const { id } = await params;
  const menuId = Number(id);
  if (!Number.isFinite(menuId)) {
    return apiError("Invalid menu id", 400);
  }

  try {
    const deleted = await deleteMenu(menuId);
    if (!deleted) {
      return apiError("Menu not found", 404);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
