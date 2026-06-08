"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Tenant } from "@/types";
import { ROLES } from "@/constants/roles.constants";

export function useTenantContext() {
  const { data: session } = useSession();
  const sessionTenantId = session?.user?.tenantId;
  const isDemo = session?.user?.role === ROLES.DEMO || session?.user?.accountType === "demo";

  const [tenantId, setTenantId] = useState(sessionTenantId ?? 1);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo && sessionTenantId) {
      setTenantId(sessionTenantId);
      setTenants([{ id: sessionTenantId } as Tenant]);
      setLoading(false);
      return;
    }

    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTenants(data);
          setTenantId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo, sessionTenantId]);

  const activeTenant = tenants.find((t) => t.id === tenantId) ?? null;

  return { tenantId, setTenantId, tenants, activeTenant, loading, isDemo, demoExpiresAt: session?.user?.demoExpiresAt };
}

export function logsFromTimeRange(range: string): { from?: string; to?: string } {
  const to = new Date().toISOString();
  const map: Record<string, number> = {
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "7d": 24 * 7,
  };
  const hours = map[range];
  if (!hours) return {};
  const from = new Date(Date.now() - hours * 3600_000).toISOString();
  return { from, to };
}
