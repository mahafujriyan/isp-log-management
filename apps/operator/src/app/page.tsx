import { PORTAL_ROUTES } from "@isp/core/constants/portal.constants";
import { redirect } from "next/navigation";

export default function OperatorRootPage() {
  redirect(PORTAL_ROUTES.operator.login);
}
