import { AdminPortalLayout } from "@/components/admin/AdminPortalLayout";

export default function AdminPortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPortalLayout>{children}</AdminPortalLayout>;
}
