import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookieHeader,
  isProtectedApiEdge,
  isProtectedPage,
  roleCanAccessRouteEdge,
} from "@/lib/auth-edge";
import { roleCanAccessApi } from "@/lib/api-rbac";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    const session = await getSessionFromCookieHeader(request.headers.get("cookie"));
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const needsAuth = isProtectedPage(pathname) || isProtectedApiEdge(pathname);
  if (!needsAuth) return NextResponse.next();

  const session = await getSessionFromCookieHeader(request.headers.get("cookie"));

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedPage(pathname) && !roleCanAccessRouteEdge(session.role, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Access denied for your role" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/?denied=1", request.url));
  }

  if (
    pathname.startsWith("/api/") &&
    isProtectedApiEdge(pathname) &&
    !roleCanAccessApi(session.role, pathname, request.method)
  ) {
    return NextResponse.json(
      { ok: false, error: "Access denied for your role", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-faos-user", session.username);
  response.headers.set("x-faos-role", session.role);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
