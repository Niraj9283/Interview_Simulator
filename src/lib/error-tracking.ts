/**
 * Centralized Error Tracking & Diagnostics
 * Captures frontend and backend exceptions with correlation IDs and strict PII scrubbing.
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  requestId?: string;
  userId?: number | string;
  metadata?: Record<string, unknown>;
}

const SCRUB_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
  /bearer/i,
  /resume/i,
  /answer/i,
];

function sanitizeContextMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(meta)) {
    if (SCRUB_PATTERNS.some((p) => p.test(key))) {
      clean[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      clean[key] = sanitizeContextMetadata(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export function captureAppError(error: unknown, context?: ErrorContext): string {
  const correlationId = context?.requestId || `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanMeta = sanitizeContextMetadata(context?.metadata);

  const errorDetails = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error && process.env.NODE_ENV !== "production" ? error.stack : undefined,
    correlationId,
    action: context?.action,
    component: context?.component,
    metadata: cleanMeta,
    timestamp: new Date().toISOString(),
  };

  // Log locally in development
  if (process.env.NODE_ENV !== "production") {
    console.error(`[AppError ${correlationId}]`, errorDetails);
  }

  // If a public Sentry DSN or endpoint is configured via NEXT_PUBLIC_SENTRY_DSN
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn && typeof window !== "undefined") {
    try {
      // Dynamic Sentry reporting if present on window
      const win = window as unknown as { Sentry?: { captureException: (err: unknown, opts: unknown) => void } };
      if (win.Sentry && typeof win.Sentry.captureException === "function") {
        win.Sentry.captureException(error, {
          tags: { correlationId, action: context?.action },
          extra: cleanMeta,
        });
      }
    } catch {
      // Error reporting failure must never disrupt application flow
    }
  }

  return correlationId;
}
