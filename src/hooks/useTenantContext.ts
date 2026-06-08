"use client";

import { useEffect, useState } from "react";
import type { Tenant } from "@/types";

export function useTenantContext() {
  const [tenantId, setTenantId] = useState(1);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const activeTenant = tenants.find((t) => t.id === tenantId) ?? null;

  return { tenantId, setTenantId, tenants, activeTenant, loading };
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
