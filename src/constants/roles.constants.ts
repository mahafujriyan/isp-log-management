export const ROLES = {
  SUPER_ADMIN: "super_admin",
  OPERATOR: "operator",
  VIEWER: "viewer",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  operator: "Operator",
  viewer: "Viewer",
};

/** Higher number = more privilege */
export const ROLE_RANK: Record<AppRole, number> = {
  super_admin: 3,
  operator: 2,
  viewer: 1,
};

export const PERMISSIONS = {
  /** Super Admin portal + tenant manager */
  ADMIN_PANEL: [ROLES.SUPER_ADMIN],
  TENANT_CREATE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  TENANT_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  TENANT_UPDATE: [ROLES.SUPER_ADMIN],
  LOGS_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  LOGS_INGEST: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  DEVICE_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  DEVICE_WRITE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  USERS_READ: [ROLES.SUPER_ADMIN, ROLES.OPERATOR, ROLES.VIEWER],
  USER_WRITE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  MENU_MANAGE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  COMPANY_MANAGE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
  BTRC_MANAGE: [ROLES.SUPER_ADMIN, ROLES.OPERATOR],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_ROLES: AppRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.OPERATOR,
  ROLES.VIEWER,
];
