"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plan, Tenant } from "@/types";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStats } from "@/components/admin/AdminStats";
import { PlansOverview } from "@/components/admin/PlansOverview";
import { TenantManager } from "@/components/admin/TenantManager";
import { useRole } from "@/hooks/useRole";

export function AdminDashboard() {
  const { session } = useRole();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userCount, setUserCount] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [tenantRes, planRes, userRes] = await Promise.all([
        fetch("/api/tenants"),
        fetch("/api/plans"),
        fetch("/api/users"),
      ]);

      const tenantData = await tenantRes.json();
      const planData = await planRes.json();
      const userData = await userRes.json();

      if (Array.isArray(tenantData)) setTenants(tenantData);
      if (Array.isArray(planData)) setPlans(planData);
      if (Array.isArray(userData)) setUserCount(userData.length);
    } catch {
      // TenantManager shows its own error state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AdminLayout
      title="Super Admin Panel"
      subtitle="System-wide tenant management and platform configuration"
      userName={session?.user?.username ?? session?.user?.name ?? undefined}
    >
      {!loading && <AdminStats tenants={tenants} userCount={userCount} />}
      {!loading && plans.length > 0 && <PlansOverview plans={plans} />}
      <TenantManager variant="dark" onTenantsChange={setTenants} />

      <div className="mt-8 text-center">
        <a
          href="/admin/metrics"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
        >
          Configure Analytics Charts →
        </a>
      </div>
    </AdminLayout>
  );
}
