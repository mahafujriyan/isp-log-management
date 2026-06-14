import type { AppRole } from "@isp/core/constants/roles.constants";
import type { DashboardPageId } from "@isp/core/types/dashboard.types";

export type MenuSection = "main" | "admin" | "system";

export interface AppMenu {
  id: number;
  label: string;
  page_id: DashboardPageId;
  url_path: string;
  section: MenuSection;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface RoleMenuAssignment {
  id: number;
  role: AppRole;
  menu_id: number;
  menu_label: string;
  menu_url: string;
  page_id: DashboardPageId;
  created_at: string;
}

export interface CreateMenuInput {
  label: string;
  page_id: DashboardPageId;
  url_path: string;
  section?: MenuSection;
  sort_order?: number;
}

export interface AssignMenuRoleInput {
  role: AppRole;
  menu_id: number;
}
