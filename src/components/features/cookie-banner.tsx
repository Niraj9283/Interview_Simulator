"use client";

import React, { useEffect, useState } from "react";
import { Cookie, ShieldCheck, X, Check, Sliders, Database, Activity, Sparkles } from "lucide-react";
import { trackConversion } from "@/lib/conversion-tracking";
import { toast } from "@/components/ui/toast";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  modelCache: boolean;
  personalization: boolean;
}

export const COOKIE_STORAGE_KEY = "mockmate_cookie_consent_v1";

export function openCookiePreferencesModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mockmate:open-cookie-preferences"));
  }
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    analytics: true,
    modelCache: true,
    personalization: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (!stored) {
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({ ...prev, ...parsed, essential: true }));
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  // Listen for global open modal events
  useEffect(() => {
    const handleOpen = () => {
      setShowPreferencesModal(true);
    };

    window.addEventListener("mockmate:open-cookie-preferences", handleOpen);
    return () => window.removeEventListener("mockmate:open-cookie-preferences", handleOpen);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const finalPrefs = { ...prefs, essential: true };
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(finalPrefs));
    } catch {
      // Ignore
    }

    // Inform conversion tracker and other subsystems
    trackConversion("cookie_consent_updated", {
      analytics: finalPrefs.analytics,
      modelCache: finalPrefs.modelCache,
      personalization: finalPrefs.personalization,
    });

    window.dispatchEvent(
      new CustomEvent("mockmate:cookie-consent-updated", { detail: finalPrefs })
    );

    setIsVisible(false);
    setShowPreferencesModal(false);
    toast.success("Privacy preferences saved successfully.", "Preferences Updated");
  };

  const handleAcceptAll = () => {
    const full = { essential: true, analytics: true, modelCache: true, personalization: true };
    setPreferences(full);
    saveConsent(full);
  };

  const handleDeclineNonEssential = () => {
    const minimal = {
      essential: true,
      analytics: false,
      modelCache: false,
      personalization: false,
    };
    setPreferences(minimal);
    saveConsent(minimal);
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  return (
    <>
      {/* Bottom Floating Consent Banner */}
      {isVisible && !showPreferencesModal && (
        <div
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#111111]/98 p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(255,77,61,0.12)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#2A2A2A] bg-[#161616] text-[#FF4D3D] shadow-inner">
                  <Cookie size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight text-[#F5F5F5]">
                      Privacy First & Local Edge Processing
                    </h2>
                    <span className="rounded bg-[#FF4D3D]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF4D3D] border border-[#FF4D3D]/30">
                      GDPR & CCPA Compliant
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#A0A0A0]">
                    MockMate AI processes your camera & audio metrics locally on your device. We use
                    privacy-focused cookies to store session states and edge AI model weights.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(true)}
                  className="rounded-xl border border-[#2A2A2A] bg-[#151515] px-3.5 py-2 text-xs font-semibold text-neutral-300 transition hover:border-[#FF4D3D]/40 hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders size={13} />
                    Preferences
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleDeclineNonEssential}
                  className="rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-xl bg-[#FF4D3D] px-4 py-2 text-xs font-bold text-neutral-950 shadow-md shadow-[#FF4D3D]/30 transition hover:bg-[#ff3826] active:scale-95 cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Cookie Preferences Modal */}
      {showPreferencesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[#FF4D3D]/10 text-[#FF4D3D] border border-[#FF4D3D]/25">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 id="cookie-preferences-title" className="text-base font-bold text-[#F5F5F5]">
                    Cookie & Telemetry Preferences
                  </h3>
                  <p className="text-xs text-[#888888]">
                    Control how MockMate AI caches edge models and collects session telemetry.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="rounded-lg p-1.5 text-[#888888] hover:bg-white/5 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {/* Essential */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-[#222222] bg-[#161616] p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold text-white">Strictly Necessary</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-neutral-300">
                      Required
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#A0A0A0]">
                    Required for core interview simulation, audio-video routing, and persistent security tokens. Cannot be disabled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 size-4 rounded accent-[#FF4D3D] opacity-60 cursor-not-allowed"
                />
              </div>

              {/* Edge Model Cache */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-[#222222] bg-[#161616] p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-[#FF4D3D]" />
                    <span className="text-xs font-bold text-white">Edge Model Cache</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#A0A0A0]">
                    Caches MediaPipe WebAssembly model weights locally inside browser IndexedDB to allow instant offline interview initialization.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.modelCache}
                  onChange={(e) =>
                    setPreferences({ ...preferences, modelCache: e.target.checked })
                  }
                  className="mt-1 size-4 rounded accent-[#FF4D3D] cursor-pointer"
                />
              </div>

              {/* Anonymous Telemetry */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-[#222222] bg-[#161616] p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-sky-400" />
                    <span className="text-xs font-bold text-white">Anonymous Telemetry</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#A0A0A0]">
                    Measures audio processing latency and anonymized WPM aggregates to tune local speech model accuracy.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences({ ...preferences, analytics: e.target.checked })
                  }
                  className="mt-1 size-4 rounded accent-[#FF4D3D] cursor-pointer"
                />
              </div>

              {/* Personalization */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-[#222222] bg-[#161616] p-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <span className="text-xs font-bold text-white">Interface Personalization</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#A0A0A0]">
                    Remembers active interview domain (Frontend, Backend, System Design) and code sandbox preferences across sessions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.personalization}
                  onChange={(e) =>
                    setPreferences({ ...preferences, personalization: e.target.checked })
                  }
                  className="mt-1 size-4 rounded accent-[#FF4D3D] cursor-pointer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-[#222222] pt-4">
              <button
                type="button"
                onClick={handleDeclineNonEssential}
                className="text-xs text-[#A0A0A0] hover:text-white underline cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex items-center gap-1.5 rounded-xl bg-[#FF4D3D] px-4 py-2 text-xs font-bold text-neutral-950 shadow-md shadow-[#FF4D3D]/25 hover:bg-[#ff3826] transition cursor-pointer"
                >
                  <Check size={14} />
                  Save Choices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
