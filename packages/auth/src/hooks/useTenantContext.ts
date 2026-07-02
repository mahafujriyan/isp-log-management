import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Tenant } from "@isp/core/types";
import { isDemoAccount } from "@isp/core/constants/roles.constants";

function pickDefaultTenant(tenants: Tenant[], sessionTenantId?: number): number | null {
  if (sessionTenantId) return sessionTenantId;
  const production =
    tenants.find((t) => t.schema_name === "tenant_001") ??
    tenants.find((t) => !t.is_demo_sandbox) ??
    tenants[0];
  return production?.id ?? null;
}

export function useTenantContext() {
  const { data: session, status } = useSession();
  const sessionTenantId = session?.user?.tenantId;
  const demo = isDemoAccount(session?.user?.role, session?.user?.accountType);

  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  // Resolve tenant from the session immediately — no network wait for operators.
  useEffect(() => {
    if (sessionTenantId != null) {
      setTenantId((prev) => prev ?? sessionTenantId);
    }
  }, [sessionTenantId]);

  // Load the tenant list in the background (for the switcher / admin default).
  useEffect(() => {
    let active = true;
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          setTenants(data);
          setTenantId((prev) => prev ?? pickDefaultTenant(data, sessionTenantId));
        } else if (sessionTenantId != null) {
          setTenantId((prev) => prev ?? sessionTenantId);
        }
      })
      .catch(() => {
        if (active && sessionTenantId != null) {
          setTenantId((prev) => prev ?? sessionTenantId);
        }
      })
      .finally(() => {
        if (active) setTenantsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [sessionTenantId]);

  const activeTenant = tenants.find((t) => t.id === tenantId) ?? null;

  // Only "loading" until we know which tenant to query. The session gives this
  // instantly for operators, so pages can fetch data without waiting for /api/tenants.
  const loading = tenantId == null && (status === "loading" || !tenantsLoaded);

  return {
    tenantId,
    setTenantId,
    tenants,
    activeTenant,
    loading,
    isDemo: demo,
    demoExpiresAt: session?.user?.demoExpiresAt,
  };
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
