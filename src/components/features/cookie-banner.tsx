"use client";

import React, { useEffect, useState } from "react";
import { Cookie, ShieldCheck, X, ChevronRight, Check } from "lucide-react";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  modelCache: boolean;
}

const STORAGE_KEY = "mockmate_cookie_consent_v1";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    analytics: true,
    modelCache: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so it smoothly slides in
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const full = { essential: true, analytics: true, modelCache: true };
    setPreferences(full);
    saveConsent(full);
  };

  const handleDeclineNonEssential = () => {
    const minimal = { essential: true, analytics: false, modelCache: false };
    setPreferences(minimal);
    saveConsent(minimal);
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#111111]/98 p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(255,77,61,0.1)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#2A2A2A] bg-[#161616] text-[#FF4D3D] shadow-inner">
              <Cookie size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-[#F5F5F5]">We value your privacy & local data autonomy</h2>
                <span className="rounded bg-[#FF4D3D]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF4D3D] border border-[#FF4D3D]/30">
                  Privacy First
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#A0A0A0]">
                MockMate AI stores your interview session transcripts and edge AI model weights locally in your browser. 
                We use privacy-friendly cookies to persist your audio settings and telemetry preferences.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="rounded-xl border border-[#2A2A2A] bg-[#151515] px-3.5 py-2 text-xs font-semibold text-neutral-300 transition hover:border-[#FF4D3D]/40 hover:text-white cursor-pointer"
            >
              Preferences
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

        {/* Expandable Preferences Section */}
        {showPreferences && (
          <div className="mt-4 border-t border-[#222222] pt-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex items-start gap-2.5 rounded-xl border border-[#222222] bg-[#161616] p-2.5">
                <input
                  type="checkbox"
                  checked={preferences.essential}
                  disabled
                  className="mt-1 size-4 rounded accent-[#FF4D3D] opacity-80 cursor-not-allowed"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Essential
                  </div>
                  <p className="text-[11px] text-[#A0A0A0]">Strictly required for session state and audio routing.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-xl border border-[#222222] bg-[#161616] p-2.5 cursor-pointer hover:border-[#FF4D3D]/40">
                <input
                  type="checkbox"
                  checked={preferences.modelCache}
                  onChange={(e) => setPreferences({ ...preferences, modelCache: e.target.checked })}
                  className="mt-1 size-4 rounded accent-[#FF4D3D] cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Edge Model Cache</div>
                  <p className="text-[11px] text-[#A0A0A0]">Cache WebAssembly/ONNX models for zero-latency offline runs.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-xl border border-[#222222] bg-[#161616] p-2.5 cursor-pointer hover:border-[#FF4D3D]/40">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1 size-4 rounded accent-[#FF4D3D] cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Anonymous Telemetry</div>
                  <p className="text-[11px] text-[#A0A0A0]">Aggregated pacing and microphone latency benchmarks.</p>
                </div>
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex items-center gap-1.5 rounded-xl bg-[#FF4D3D] px-4 py-1.5 text-xs font-bold text-neutral-950 transition hover:bg-[#ff3826] cursor-pointer"
              >
                <Check size={14} />
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
