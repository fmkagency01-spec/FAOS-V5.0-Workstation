import type { ZodType } from "zod";
import { ApiError } from "@/lib/api-errors";

/** Parse & validate request body — rejects invalid data before any DB/API work. */
export function parseBody<T>(schema: ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first
      ? `${first.path.join(".") || "body"}: ${first.message}`
      : "Request validation failed";
    throw ApiError.badRequest(message, "Fix the request payload and retry once.");
  }
  return result.data;
}

export async function parseJsonWithSchema<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw ApiError.badRequest("Invalid JSON body.");
  }
  return parseBody(schema, raw);
}
