import { NextRequest, NextResponse } from "next/server";
import {
  getSessionFromCookieHeader,
  isProtectedApiEdge,
  isProtectedPage,
  normalizeRole,
  roleCanAccessRouteEdge,
} from "@/lib/auth-edge";
import { roleCanAccessApi } from "@/lib/api-rbac";
import { isClientPortalPath, postLoginRedirect } from "@/lib/rbac-guards";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    const session = await getSessionFromCookieHeader(request.headers.get("cookie"));
    if (session) {
      const dest = postLoginRedirect(session.role, session.tenant_id);
      return NextResponse.redirect(new URL(dest, request.url));
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

  const role = normalizeRole(session.role);

  // External B2B clients are locked to their portal — no master dashboard / JARVIS / agency data
  if (role === "client") {
    const allowedApi =
      pathname.startsWith("/api/apps/rr-wigs") ||
      pathname.startsWith("/api/auth") ||
      pathname === "/api/health";
    const allowedPage = isClientPortalPath(pathname);

    if (pathname.startsWith("/api/")) {
      if (!allowedApi) {
        return NextResponse.json(
          {
            ok: false,
            error: "Client portal cannot access agency / JARVIS / other-tenant APIs",
            code: "TENANT_ISOLATED",
          },
          { status: 403 }
        );
      }
    } else if (!allowedPage) {
      return NextResponse.redirect(new URL("/portal/rr-wigs", request.url));
    }
  }

  if (isProtectedPage(pathname) && !roleCanAccessRouteEdge(session.role, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Access denied for your role" }, { status: 403 });
    }
    if (role === "client") {
      return NextResponse.redirect(new URL("/portal/rr-wigs", request.url));
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
  if (session.tenant_id) {
    response.headers.set("x-faos-tenant", session.tenant_id);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
