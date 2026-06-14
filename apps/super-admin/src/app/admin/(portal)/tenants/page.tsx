import { AdminPageHeader } from "@isp/features/admin/components/AdminPortalLayout";
import { TenantManager } from "@isp/features/admin/components/TenantManager";

export default function AdminTenantsPage() {
  return (
    <>
      <AdminPageHeader
        title="Tenant Management"
        subtitle="Create, suspend, and monitor isolated ISP tenants"
      />
      <TenantManager variant="dark" />
    </>
  );
}
