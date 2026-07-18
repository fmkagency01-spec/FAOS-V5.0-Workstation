/** Standard FAOS API error — throw once, return immediately (no retry loops). */
export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "UPSTREAM"
  | "CONFIG"
  | "INTERNAL";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly hint?: string;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    hint?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.hint = hint;
  }

  static badRequest(message: string, hint?: string) {
    return new ApiError(400, "VALIDATION", message, hint);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Access denied for your role") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message: string) {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static rateLimit(message: string) {
    return new ApiError(429, "RATE_LIMIT", message);
  }

  static upstream(message: string, hint?: string) {
    return new ApiError(502, "UPSTREAM", message, hint);
  }

  static config(message: string) {
    return new ApiError(503, "CONFIG", message);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
