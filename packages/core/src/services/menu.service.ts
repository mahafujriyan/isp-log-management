import type { AppRole } from "@isp/core/constants/roles.constants";
import { db } from "@isp/core/lib/database";
import type {
  AppMenu,
  AssignMenuRoleInput,
  CreateMenuInput,
  RoleMenuAssignment,
} from "@isp/core/types/menu.types";

export async function listMenus(): Promise<AppMenu[]> {
  return db.getMany<AppMenu>(
    `SELECT id, label, page_id, url_path, section, sort_order, is_active, created_at
     FROM public.app_menus
     ORDER BY sort_order ASC, id ASC`
  );
}

export async function listMenusForRole(role: AppRole): Promise<AppMenu[]> {
  return db.getMany<AppMenu>(
    `SELECT m.id, m.label, m.page_id, m.url_path, m.section, m.sort_order, m.is_active, m.created_at
     FROM public.app_menus m
     INNER JOIN public.role_menu_assignments rma ON rma.menu_id = m.id
     WHERE rma.role = $1 AND m.is_active = TRUE
     ORDER BY m.sort_order ASC, m.id ASC`,
    [role]
  );
}

export async function createMenu(input: CreateMenuInput): Promise<AppMenu> {
  const row = await db.getOne<AppMenu>(
    `INSERT INTO public.app_menus (label, page_id, url_path, section, sort_order)
     VALUES ($1, $2, $3, $4, COALESCE($5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.app_menus)))
     RETURNING id, label, page_id, url_path, section, sort_order, is_active, created_at`,
    [input.label, input.page_id, input.url_path, input.section ?? "main", input.sort_order ?? null]
  );
  if (!row) throw new Error("Failed to create menu");
  return row;
}

export async function deleteMenu(id: number): Promise<boolean> {
  const result = await db.query("DELETE FROM public.app_menus WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listRoleMenuAssignments(): Promise<RoleMenuAssignment[]> {
  return db.getMany<RoleMenuAssignment>(
    `SELECT
       rma.id,
       rma.role,
       rma.menu_id,
       m.label AS menu_label,
       m.url_path AS menu_url,
       m.page_id,
       rma.created_at
     FROM public.role_menu_assignments rma
     INNER JOIN public.app_menus m ON m.id = rma.menu_id
     ORDER BY rma.role ASC, m.sort_order ASC, rma.id ASC`
  );
}

export async function assignMenuToRole(input: AssignMenuRoleInput): Promise<RoleMenuAssignment> {
  const row = await db.getOne<RoleMenuAssignment>(
    `WITH inserted AS (
       INSERT INTO public.role_menu_assignments (role, menu_id)
       VALUES ($1, $2)
       ON CONFLICT (role, menu_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, role, menu_id, created_at
     )
     SELECT i.id, i.role, i.menu_id, m.label AS menu_label, m.url_path AS menu_url, m.page_id, i.created_at
     FROM inserted i
     INNER JOIN public.app_menus m ON m.id = i.menu_id`,
    [input.role, input.menu_id]
  );
  if (!row) throw new Error("Failed to assign menu to role");
  return row;
}

export async function deleteRoleMenuAssignment(id: number): Promise<boolean> {
  const result = await db.query("DELETE FROM public.role_menu_assignments WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
