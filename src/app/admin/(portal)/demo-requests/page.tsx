import { AdminPageHeader } from "@/components/admin/AdminPortalLayout";
import { DemoRequestsPanel } from "@/components/admin/DemoRequestsPanel";

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
