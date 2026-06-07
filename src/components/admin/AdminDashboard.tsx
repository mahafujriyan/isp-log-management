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
    </AdminLayout>
  );
}
