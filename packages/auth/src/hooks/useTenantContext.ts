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
  const { data: session } = useSession();
  const sessionTenantId = session?.user?.tenantId;
  const demo = isDemoAccount(session?.user?.role, session?.user?.accountType);

  const [tenantId, setTenantId] = useState<number | null>(sessionTenantId ?? null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demo && sessionTenantId) {
      fetch(`/api/tenants`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setTenants(data);
            setTenantId(sessionTenantId);
          } else {
            setTenantId(sessionTenantId);
          }
        })
        .catch(() => setTenantId(sessionTenantId))
        .finally(() => setLoading(false));
      return;
    }

    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTenants(data);
          setTenantId(pickDefaultTenant(data, sessionTenantId));
        } else if (sessionTenantId) {
          setTenantId(sessionTenantId);
        }
      })
      .catch(() => {
        if (sessionTenantId) setTenantId(sessionTenantId);
      })
      .finally(() => setLoading(false));
  }, [demo, sessionTenantId]);

  const activeTenant = tenants.find((t) => t.id === tenantId) ?? null;

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
