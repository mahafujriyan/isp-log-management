"use client";

import { AdminPageHeader } from "@isp/features/admin/components/AdminPortalLayout";
import { PlanManagerPanel } from "@isp/features/admin/components/PlanManagerPanel";

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
