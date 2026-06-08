import { AdminPageHeader } from "@/components/admin/AdminPortalLayout";
import { CompanySettingsPanel } from "@/components/dashboard/CompanySettingsPanel";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Platform Settings"
        subtitle="Organization defaults and backup configuration"
      />
      <CompanySettingsPanel />
    </>
  );
}
