import { ROUTES } from "@/constants/routes.constants";
import { auth } from "@/auth";
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

  if (pathname.startsWith(ROUTES.admin) && isLoggedIn && role !== "super_admin") {
    return NextResponse.redirect(new URL(ROUTES.dashboard, req.url));
  }

  if (isAuthPage && isLoggedIn) {
    const target =
      role === "super_admin" && pathname.startsWith(ROUTES.auth.superAdmin)
        ? ROUTES.admin
        : ROUTES.dashboard;
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (pathname === ROUTES.home && isLoggedIn) {
    return NextResponse.redirect(
      new URL(role === "super_admin" ? ROUTES.admin : ROUTES.dashboard, req.url)
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
