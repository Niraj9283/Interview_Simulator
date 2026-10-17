"use client";

export type ConversionEventName =
  | "page_view"
  | "interview_started"
  | "interview_completed"
  | "code_executed"
  | "system_design_started"
  | "resume_uploaded"
  | "feedback_submitted"
  | "cookie_consent_updated"
  | "search_performed"
  | "faq_viewed"
  | "telemetry_calibrated";

export interface ConversionEventPayload {
  category?: string;
  label?: string;
  value?: number;
  domain?: string;
  difficulty?: string;
  wpm?: number;
  durationSeconds?: number;
  timestamp?: string;
  [key: string]: unknown;
}

const STORAGE_KEY = "mockmate_cookie_consent_v1";

/**
 * Checks if user has permitted analytics / telemetry tracking
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true; // Default privacy policy allows anonymized event until declined
    const parsed = JSON.parse(raw);
    return Boolean(parsed.analytics !== false);
  } catch {
    return false;
  }
}

/**
 * Core conversion tracking dispatcher
 */
export function trackConversion(
  eventName: ConversionEventName,
  payload: ConversionEventPayload = {}
): void {
  if (typeof window === "undefined") return;

  const enrichedPayload: ConversionEventPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
  };

  // 1. Dispatch custom DOM event for internal subscribers & debug tooling
  window.dispatchEvent(
    new CustomEvent("mockmate:conversion", {
      detail: { event: eventName, payload: enrichedPayload },
    })
  );

  // If user declined analytics, abort external dispatches
  if (!hasAnalyticsConsent()) {
    return;
  }

  // 2. Google Analytics (gtag) integration if initialized
  const windowWithGtag = window as unknown as {
    gtag?: (command: string, action: string, params: Record<string, unknown>) => void;
  };
  if (typeof windowWithGtag.gtag === "function") {
    try {
      windowWithGtag.gtag("event", eventName, enrichedPayload);
    } catch (e) {
      console.debug("[Analytics] gtag error:", e);
    }
  }

  // 3. Vercel Analytics custom event dispatch if present
  const windowWithVa = window as unknown as {
    va?: (action: string, event: string, params: Record<string, unknown>) => void;
  };
  if (typeof windowWithVa.va === "function") {
    try {
      windowWithVa.va("event", eventName, enrichedPayload);
    } catch (e) {
      console.debug("[Analytics] va error:", e);
    }
  }

  // 4. Session telemetry buffer in sessionStorage
  try {
    const bufferKey = "mockmate_conversion_log";
    const existing = JSON.parse(sessionStorage.getItem(bufferKey) || "[]");
    existing.push({ event: eventName, ...enrichedPayload });
    if (existing.length > 50) existing.shift();
    sessionStorage.setItem(bufferKey, JSON.stringify(existing));
  } catch {
    // SessionStorage quota exceeded or disabled
  }
}
