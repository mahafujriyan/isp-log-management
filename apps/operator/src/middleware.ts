import { PORTAL_ROUTES } from "@isp/core/constants/portal.constants";
import { ROUTES } from "@isp/core/constants/routes.constants";
import { ROLES } from "@isp/core/constants/roles.constants";
import { auth } from "@isp/auth/edge";
import { NextResponse } from "next/server";

/** Operator portal + legacy dashboard — app.cyberlink.com */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isLoginPage = pathname.startsWith(ROUTES.auth.login);
  const isOperatorPortal = pathname.startsWith(PORTAL_ROUTES.operator.home);
  const isLegacyDashboard = pathname.startsWith(ROUTES.dashboard);
  const isProtected = isOperatorPortal || isLegacyDashboard;

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL(ROUTES.auth.login, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && isLoggedIn) {
    const target =
      role === ROLES.SUPER_ADMIN
        ? (process.env.NEXT_PUBLIC_ADMIN_URL ?? ROUTES.admin)
        : PORTAL_ROUTES.operator.home;
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/operator/:path*", "/dashboard/:path*", "/auth/login"],
};
