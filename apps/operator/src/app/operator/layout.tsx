import { OperatorPortalLayout } from "@isp/features/operator/components/OperatorPortalLayout";

export default function OperatorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OperatorPortalLayout>{children}</OperatorPortalLayout>;
}
