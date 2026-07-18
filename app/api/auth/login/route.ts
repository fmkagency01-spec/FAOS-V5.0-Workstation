import { NextRequest } from "next/server";
import {
  authenticateUser,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";
import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { loginSchema } from "@/lib/validation/schemas";
import { assertApiRateLimit, resolveClientIp } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiRoute(
  async (request: NextRequest) => {
    const ip = resolveClientIp(request.headers);
    // Stricter login bucket — fail fast, no credential spray loops
    assertApiRateLimit(`login:${ip}`, "auth/login");

    const body = await parseJsonWithSchema(request, loginSchema);
    const user = authenticateUser(body.username, body.password);
    if (!user) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    const token = await createSessionToken(user);
    const response = jsonOk({
      user: { username: user.username, name: user.name, role: user.role },
    });
    const opts = sessionCookieOptions(token);
    response.cookies.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
      maxAge: opts.maxAge,
    });
    return response;
  },
  { rateLimitKey: "auth/login" }
);

export const GET = withApiRoute(async (request: NextRequest) => {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    throw ApiError.unauthorized("Not authenticated");
  }
  return jsonOk({
    authenticated: true,
    user: { username: session.username, name: session.name, role: session.role },
  });
});
