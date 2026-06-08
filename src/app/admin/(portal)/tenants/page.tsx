import { AdminPageHeader } from "@/components/admin/AdminPortalLayout";
import { TenantManager } from "@/components/admin/TenantManager";

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
