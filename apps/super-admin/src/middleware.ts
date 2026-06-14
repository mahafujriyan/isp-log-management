import { PORTAL_ROUTES } from "@isp/core/constants/portal.constants";
import { ROUTES } from "@isp/core/constants/routes.constants";
import { ROLES } from "@isp/core/constants/roles.constants";
import { auth } from "@isp/auth/edge";
import { NextResponse } from "next/server";

/** Super Admin portal — admin.cyberlink.com */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isLoginPage =
    pathname === PORTAL_ROUTES.admin.login ||
    pathname.startsWith(ROUTES.auth.superAdmin);

  const isAdminPortal =
    pathname.startsWith(ROUTES.admin) && pathname !== PORTAL_ROUTES.admin.login;

  if (isAdminPortal && !isLoggedIn) {
    const loginUrl = new URL(PORTAL_ROUTES.admin.login, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPortal && isLoggedIn && role !== ROLES.SUPER_ADMIN) {
    const operatorUrl = process.env.NEXT_PUBLIC_OPERATOR_URL ?? "/";
    return NextResponse.redirect(operatorUrl);
  }

  if (isLoginPage && isLoggedIn && role === ROLES.SUPER_ADMIN) {
    return NextResponse.redirect(new URL(ROUTES.admin, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/auth/super-admin"],
};
