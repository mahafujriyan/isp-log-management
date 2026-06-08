"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plan, Tenant } from "@/types";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStats } from "@/components/admin/AdminStats";
import { PlansOverview } from "@/components/admin/PlansOverview";
import { TenantManager } from "@/components/admin/TenantManager";
import { useRole } from "@/hooks/useRole";

export function AdminDashboard({ embedded = false }: { embedded?: boolean }) {
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

  const body = (
    <>
      {!loading && <AdminStats tenants={tenants} userCount={userCount} />}
      {!loading && plans.length > 0 && <PlansOverview plans={plans} />}
      <TenantManager variant="dark" onTenantsChange={setTenants} />
      {!embedded && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/admin/demo-requests"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
          >
            Demo Requests →
          </a>
          <a
            href="/admin/billing"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
          >
            Manage Pricing →
          </a>
          <a
            href="/admin/metrics"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
          >
            Configure Analytics Charts →
          </a>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {session?.user?.username ?? session?.user?.name ?? "Admin"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">System-wide tenant management and platform configuration</p>
        </div>
        {body}
      </>
    );
  }

  return (
    <AdminLayout
      title="Super Admin Panel"
      subtitle="System-wide tenant management and platform configuration"
      userName={session?.user?.username ?? session?.user?.name ?? undefined}
    >
      {body}
    </AdminLayout>
  );
}
