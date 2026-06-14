import { AdminPageHeader } from "@isp/features/admin/components/AdminPortalLayout";
import { CompanySettingsPanel } from "@isp/features/console/components/CompanySettingsPanel";

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
