import { AdminPageHeader } from "@isp/features/admin/components/AdminPortalLayout";
import { DemoRequestsPanel } from "@isp/features/admin/components/DemoRequestsPanel";

export default function AdminDemoRequestsPage() {
  return (
    <>
      <AdminPageHeader
        title="Demo Requests"
        subtitle="Review landing page submissions and provision time-limited sandbox logins"
      />
      <DemoRequestsPanel />
    </>
  );
}
