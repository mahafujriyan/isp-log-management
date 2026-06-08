"use client";

import { AdminPageHeader } from "@/components/admin/AdminPortalLayout";
import { PlanManagerPanel } from "@/components/admin/PlanManagerPanel";

export default function AdminBillingPage() {
  return (
    <>
      <AdminPageHeader
        title="Billing & Plans"
        subtitle="Set pricing shown on the marketing landing page and used for tenant provisioning"
      />
      <PlanManagerPanel />
    </>
  );
}
