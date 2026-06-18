import type { Context } from "hono";

export type ErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "not_found"
  | "carrier_ineligible"
  | "negotiation_limit_reached"
  | "internal_error";

// Keep this list aligned to the MVP API contract; add statuses only when a route needs them.
export type ErrorHttpStatus = 400 | 401 | 404 | 409 | 500;

export function errorResponse(
  context: Context,
  status: ErrorHttpStatus,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
) {
  return context.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    status,
  );
}
