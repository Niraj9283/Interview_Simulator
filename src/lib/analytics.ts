/**
 * Privacy-Centric Analytics Tracker
 * Wraps @vercel/analytics/react track() with PII scrubbing and Cookie Banner consent compliance.
 */

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /secret/i,
  /auth/i,
  /key/i,
  /resume/i,
  /answer/i,
  /transcript/i,
  /email/i,
];

function isAnalyticsConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consent = localStorage.getItem("mockmate_cookie_consent");
    if (!consent) return true; // Default to standard until explicit opt-out
    const parsed = JSON.parse(consent);
    return parsed.analytics !== false;
  } catch {
    return true;
  }
}

export function sanitizeProperties(props?: AnalyticsProperties): Record<string, string | number | boolean> {
  if (!props) return {};
  const clean: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(props)) {
    // Filter out keys matching sensitive patterns
    if (SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return clean;
}

export function trackAnalyticsEvent(name: string, properties?: AnalyticsProperties): void {
  if (!isAnalyticsConsentGranted()) {
    return;
  }

  const cleanProps = sanitizeProperties(properties);

  try {
    // Safely attempt Vercel analytics dynamic dispatch
    import("@vercel/analytics")
      .then((pkg) => {
        if (typeof pkg.track === "function") {
          pkg.track(name, cleanProps);
        }
      })
      .catch(() => {
        // Analytics package not active or blocked by client ad-blocker
      });
  } catch {
    // Silent fail so user application execution is completely uninterrupted
  }
}
