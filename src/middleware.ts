import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAuthPage =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/super-admin");
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const loginUrl = pathname.startsWith("/admin")
      ? new URL("/auth/super-admin", req.url)
      : new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && isLoggedIn && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAuthPage && isLoggedIn) {
    const target =
      role === "super_admin" && pathname.startsWith("/auth/super-admin")
        ? "/admin"
        : "/dashboard";
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(
      new URL(role === "super_admin" ? "/admin" : "/dashboard", req.url)
    );
  }

  if (pathname === "/" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/auth/login", "/auth/super-admin"],
};
