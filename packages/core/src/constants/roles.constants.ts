export const ROLES = {
  SUPER_ADMIN: "super_admin",
  OPERATOR: "operator",
  VIEWER: "viewer",
  DEMO: "demo",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  operator: "Operator",
  viewer: "Viewer",
  demo: "Demo",
};

/** Higher number = more privilege */
export const ROLE_RANK: Record<AppRole, number> = {
  super_admin: 4,
  operator: 3,
  viewer: 2,
  demo: 1,
};

export const PERMISSIONS = {
  /** Super Admin portal + tenant manager */
  ADMIN_PANEL: [ROLES.SUPER_ADMIN],
  DEMO_REQUEST_MANAGE: [ROLES.SUPER_ADMIN],
  TENANT_CREATE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  TENANT_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
  TENANT_UPDATE: [ROLES.SUPER_ADMIN],
  LOGS_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
  LOGS_INGEST: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  DEVICE_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
  DEVICE_WRITE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  USERS_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
  USER_WRITE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  MENU_MANAGE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  COMPANY_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
  COMPANY_WRITE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  COMPANY_MANAGE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
  PLAN_MANAGE: [ROLES.SUPER_ADMIN],
  BTRC_MANAGE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER, ROLES.DEMO],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_ROLES: AppRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.OPERATOR,
  ROLES.VIEWER,
  ROLES.DEMO,
];

export function isDemoAccount(role?: string | null, accountType?: string | null): boolean {
  return role === ROLES.DEMO || accountType === "demo";
}
