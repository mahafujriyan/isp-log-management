import {
  ALL_ROLES,
  PERMISSIONS,
  ROLE_RANK,
  type AppRole,
  type Permission,
} from "@isp/core/constants/roles.constants";

export function isAppRole(value: string | undefined | null): value is AppRole {
  return !!value && ALL_ROLES.includes(value as AppRole);
}

export function hasRole(userRole: string | undefined | null, allowed: readonly string[]): boolean {
  return !!userRole && allowed.includes(userRole);
}

export function hasPermission(userRole: string | undefined | null, permission: Permission): boolean {
  return hasRole(userRole, PERMISSIONS[permission]);
}

export function isRoleAtLeast(userRole: string | undefined | null, minimum: AppRole): boolean {
  if (!isAppRole(userRole)) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[minimum];
}

export function canAccessAdminPanel(role: string | undefined | null): boolean {
  return hasPermission(role, "ADMIN_PANEL");
}

export function canManageTenants(role: string | undefined | null): boolean {
  return hasPermission(role, "TENANT_CREATE");
}
