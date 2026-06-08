import { OperatorPortalLayout } from "@/components/operator/OperatorPortalLayout";

export default function OperatorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OperatorPortalLayout>{children}</OperatorPortalLayout>;
}
