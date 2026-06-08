import { PORTAL_ROUTES } from "@/constants/portal.constants";
import { ROUTES } from "@/constants/routes.constants";
import { ROLES, isDemoAccount } from "@/constants/roles.constants";
import { auth } from "@/auth.edge";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const accountType = req.auth?.user?.accountType;
  const demoAccount = isDemoAccount(role, accountType);

  const isPublicAuthPage =
    pathname.startsWith(ROUTES.auth.login) ||
    pathname.startsWith(ROUTES.auth.superAdmin) ||
    pathname === PORTAL_ROUTES.admin.login;

  const isAdminPortal =
    pathname.startsWith(ROUTES.admin) && pathname !== PORTAL_ROUTES.admin.login;

  const isOperatorPortal = pathname.startsWith(PORTAL_ROUTES.operator.home);
  const isLegacyDashboard = pathname.startsWith(ROUTES.dashboard);

  const isProtected = isAdminPortal || isOperatorPortal || isLegacyDashboard;

  if (isProtected && !isLoggedIn) {
    let loginUrl: URL;
    if (isAdminPortal) {
      loginUrl = new URL(PORTAL_ROUTES.admin.login, req.url);
    } else if (isOperatorPortal) {
      loginUrl = new URL(ROUTES.auth.login, req.url);
    } else {
      loginUrl = new URL(ROUTES.auth.login, req.url);
    }
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Demo accounts: full operator + dashboard UI, but never super admin
  if (demoAccount && isAdminPortal) {
    return NextResponse.redirect(new URL(PORTAL_ROUTES.operator.home, req.url));
  }

  if (isAdminPortal && isLoggedIn && role !== ROLES.SUPER_ADMIN) {
    return NextResponse.redirect(new URL(PORTAL_ROUTES.operator.home, req.url));
  }

  if (isPublicAuthPage && isLoggedIn) {
    if (pathname === PORTAL_ROUTES.admin.login || pathname.startsWith(ROUTES.auth.superAdmin)) {
      if (role === ROLES.SUPER_ADMIN) {
        return NextResponse.redirect(new URL(ROUTES.admin, req.url));
      }
    }
    if (pathname.startsWith(ROUTES.auth.login)) {
      const target =
        role === ROLES.SUPER_ADMIN ? ROUTES.admin : PORTAL_ROUTES.operator.home;
      return NextResponse.redirect(new URL(target, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/operator/:path*",
    "/admin/:path*",
    "/auth/login",
    "/auth/super-admin",
  ],
};
