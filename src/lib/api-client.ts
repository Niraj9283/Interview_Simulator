/**
 * Centralized API Client with Request Correlation & Normalized Error Handling
 */

export interface NormalizedApiError {
  status: number;
  message: string;
  detail?: string;
  requestId?: string;
  retryAfter?: number;
}

export class ApiError extends Error {
  status: number;
  detail?: string;
  requestId?: string;
  retryAfter?: number;

  constructor(status: number, message: string, detail?: string, requestId?: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
  }
}

/**
 * Normalizes HTTP error responses into a human-friendly message.
 * Never leaks Python stack traces, internal SQL errors, or sensitive keys.
 */
export function normalizeErrorMessage(status: number, rawData?: Record<string, unknown>): string {
  // Check if detail is a user-friendly string
  if (typeof rawData?.detail === "string" && rawData.detail.trim()) {
    const detail = rawData.detail.trim();
    // Scrub internal server traces if any
    if (
      detail.includes("Traceback") ||
      detail.includes("File ") ||
      detail.includes("sqlite3.") ||
      detail.includes("psycopg")
    ) {
      return "An unexpected server error occurred. Our engineering team has been notified.";
    }
    return detail;
  }

  if (typeof rawData?.message === "string" && rawData.message.trim()) {
    return rawData.message.trim();
  }

  switch (status) {
    case 400:
      return "The request was invalid. Please review your entries and try again.";
    case 401:
      return "Your session has expired or the credentials provided are incorrect. Please log in.";
    case 403:
      return "You do not have permission to perform this action. Email verification may be required.";
    case 404:
      return "The requested record or simulation was not found.";
    case 409:
      return "A duplicate submission was detected. Please wait before retrying.";
    case 413:
      return "The uploaded file exceeds the maximum allowed size limit.";
    case 422:
      return "Form validation failed. Please check that all required fields are correctly formatted.";
    case 429:
      return "Too many requests. Please wait a moment before trying again.";
    case 500:
    case 502:
    case 503:
      return "Service temporarily unavailable. Please try again shortly.";
    default:
      return "An unexpected error occurred. Please refresh or try again.";
  }
}

/**
 * Standard fetch wrapper that attaches correlation IDs, parses responses,
 * and handles errors consistently across Next.js and FastAPI.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Request-ID", requestId);

  // Send credentials for HttpOnly cookie sessions
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || "include",
  };

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let data: unknown = null;
    if (isJson) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const parsedRecord = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined;
      const message = normalizeErrorMessage(response.status, parsedRecord);
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
      const respRequestId = response.headers.get("x-request-id") || requestId;

      throw new ApiError(
        response.status,
        message,
        typeof parsedRecord?.detail === "string" ? parsedRecord.detail : undefined,
        respRequestId,
        retryAfter
      );
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network failures / offline errors
    throw new ApiError(
      0,
      "Unable to connect to the server. Please check your internet connection and try again.",
      err instanceof Error ? err.message : undefined,
      requestId
    );
  }
}
