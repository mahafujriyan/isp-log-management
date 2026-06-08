"use client";

import { useEffect, useState } from "react";
import type { Plan } from "@/types";
import { AdminPageHeader } from "@/components/admin/AdminPortalLayout";
import { PlansOverview } from "@/components/admin/PlansOverview";

export default function AdminBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Billing & Plans"
        subtitle="Subscription tiers synced with tenant provisioning"
      />
      {plans.length > 0 ? (
        <PlansOverview plans={plans} />
      ) : (
        <p className="text-slate-400">Loading plans...</p>
      )}
    </>
  );
}
