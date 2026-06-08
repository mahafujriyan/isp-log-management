import {
  createMenu,
  listMenus,
  listMenusForRole,
} from "@/services/menu.service";
import { auth } from "@/auth";
import { apiError, rejectDemoWrite, requirePermission } from "@/utils/api.utils";
import { mapDatabaseError } from "@/utils/db-error.utils";
import { isAppRole } from "@/utils/rbac.utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const forRole = searchParams.get("forRole");

  try {
    if (forRole === "current") {
      const role = session.user?.role;
      if (!isAppRole(role)) {
        return apiError("Invalid role", 403);
      }
      const menus = await listMenusForRole(role);
      return NextResponse.json(menus);
    }

    const { error: permError } = await requirePermission("MENU_MANAGE");
    if (permError) return permError;

    const menus = await listMenus();
    return NextResponse.json(menus);
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
    const label = String(body.label ?? "").trim();
    const pageId = String(body.page_id ?? "").trim();
    const urlPath = String(body.url_path ?? "").trim();
    const section = String(body.section ?? "main").trim();

    if (!label || !pageId || !urlPath) {
      return apiError("Validation failed", 400, "label, page_id, and url_path are required");
    }

    const menu = await createMenu({
      label,
      page_id: pageId as never,
      url_path: urlPath,
      section: section as never,
      sort_order: body.sort_order ? Number(body.sort_order) : undefined,
    });

    return NextResponse.json(menu, { status: 201 });
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
