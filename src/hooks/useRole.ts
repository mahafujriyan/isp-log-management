"use client";

import { useSession } from "next-auth/react";
import type { AppRole, Permission } from "@/constants/roles.constants";
import { hasPermission, isRoleAtLeast } from "@/utils/rbac.utils";

export function useRole() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  return {
    session,
    status,
    role,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    can: (permission: Permission) => hasPermission(role, permission),
    isAtLeast: (minimum: AppRole) => isRoleAtLeast(role, minimum),
    isSuperAdmin: role === "super_admin",
    isDemo: role === "demo" || session?.user?.accountType === "demo",
    tenantId: session?.user?.tenantId,
    demoExpiresAt: session?.user?.demoExpiresAt,
  };
}
