import { AdminPortalLayout } from "@isp/features/admin/components/AdminPortalLayout";

export default function AdminPortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPortalLayout>{children}</AdminPortalLayout>;
}
