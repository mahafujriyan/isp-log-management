import { PORTAL_ROUTES } from "@isp/core/constants/portal.constants";
import { redirect } from "next/navigation";

export default function SuperAdminRootPage() {
  redirect(PORTAL_ROUTES.admin.login);
}
