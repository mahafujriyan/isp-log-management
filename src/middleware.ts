import { ROUTES } from "@/constants/routes.constants";
import { ROLES } from "@/constants/roles.constants";
import { auth } from "@/auth.edge";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAuthPage =
    pathname.startsWith(ROUTES.auth.login) ||
    pathname.startsWith(ROUTES.auth.superAdmin);
  const isProtected =
    pathname.startsWith(ROUTES.dashboard) || pathname.startsWith(ROUTES.admin);

  if (isProtected && !isLoggedIn) {
    const loginUrl = pathname.startsWith(ROUTES.admin)
      ? new URL(ROUTES.auth.superAdmin, req.url)
      : new URL(ROUTES.auth.login, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ROUTES.admin) && isLoggedIn && role !== ROLES.SUPER_ADMIN) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, req.url));
  }

  if (isAuthPage && isLoggedIn) {
    const target =
      role === ROLES.SUPER_ADMIN && pathname.startsWith(ROUTES.auth.superAdmin)
        ? ROUTES.admin
        : ROUTES.dashboard;
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (pathname === ROUTES.home && isLoggedIn) {
    return NextResponse.redirect(
      new URL(role === ROLES.SUPER_ADMIN ? ROUTES.admin : ROUTES.dashboard, req.url)
    );
  }

  if (pathname === ROUTES.home && !isLoggedIn) {
    return NextResponse.redirect(new URL(ROUTES.auth.login, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/auth/login", "/auth/super-admin"],
};
