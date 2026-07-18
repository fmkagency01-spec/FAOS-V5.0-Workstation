import { NextRequest } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { loadAuthUsers } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiRoute(async (request: NextRequest) => {
  const role = request.headers.get("x-faos-role");
  if (role !== "owner") {
    throw ApiError.forbidden("Only the owner can list team users.");
  }

  const users = loadAuthUsers().map(({ password: _pw, ...user }) => ({
    ...user,
    password_set: true,
  }));

  return jsonOk({ users, count: users.length });
});
