import type { ApiResult } from "@/types/api";

/** Error thrown by the client fetch wrapper, carrying the server's status/code. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Typed fetch for client components. Unwraps the { data } / { error } envelope,
 * throws ApiClientError on failure, and leaves Content-Type alone for FormData.
 */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const res = await fetch(input, {
    ...init,
    headers: isFormData
      ? init?.headers
      : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  let json: ApiResult<T> | null = null;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    /* empty / non-JSON body */
  }

  if (!res.ok || !json || "error" in json) {
    const message =
      json && "error" in json
        ? json.error.message
        : `Request failed (${res.status})`;
    const code = json && "error" in json ? json.error.code : undefined;
    throw new ApiClientError(res.status, message, code);
  }

  return json.data;
}
