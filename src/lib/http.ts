import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Domain error carrying an HTTP status. Thrown by services, mapped by handleError. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(status: number, message: string, code?: string) {
  return NextResponse.json({ error: { message, code } }, { status });
}

/**
 * Single funnel for turning thrown errors into safe HTTP responses. Never leaks
 * internal details to the client; logs the real error server-side.
 */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return fail(err.status, err.message, err.code);
  }
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join(".") || "field"}: ${i.message}`)
      .join("; ");
    return fail(422, message, "VALIDATION_ERROR");
  }
  if (err instanceof SyntaxError) {
    return fail(400, "Malformed request body.", "BAD_JSON");
  }
  console.error("[api] Unhandled error:", err);
  return fail(500, "Something went wrong. Please try again.", "INTERNAL");
}
