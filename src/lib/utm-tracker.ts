/**
 * UTM Campaign and Referral Tracking Utility
 * Captures marketing and acquisition query parameters for session attribution.
 */

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  referrer?: string;
  capturedAt?: string;
}

const STORAGE_KEY = "mockmate_utm_data";

export function captureUTM(): UTMParams | null {
  if (typeof window === "undefined") return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get("utm_source");
    const utmMedium = urlParams.get("utm_medium");
    const utmCampaign = urlParams.get("utm_campaign");
    const utmTerm = urlParams.get("utm_term");
    const utmContent = urlParams.get("utm_content");
    const ref = urlParams.get("ref");

    const hasParams = utmSource || utmMedium || utmCampaign || utmTerm || utmContent || ref;

    if (hasParams) {
      const data: UTMParams = {
        ...(utmSource ? { utm_source: utmSource } : {}),
        ...(utmMedium ? { utm_medium: utmMedium } : {}),
        ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
        ...(utmTerm ? { utm_term: utmTerm } : {}),
        ...(utmContent ? { utm_content: utmContent } : {}),
        ...(ref ? { ref } : {}),
        referrer: document.referrer || "direct",
        capturedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }

    // Return existing stored UTM if present
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UTMParams;
    }
  } catch (err) {
    console.warn("Unable to capture UTM parameters:", err);
  }

  return null;
}

export function getStoredUTM(): UTMParams | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
