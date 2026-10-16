"use client";

import React from "react";
import { Sparkles, BrainCircuit } from "lucide-react";

/**
 * Skeleton card for loading interview turns and evaluation metrics
 */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-fuchsia-400/20 bg-white/5 p-6 backdrop-blur ${className}`}
      role="status"
      aria-label="Loading content..."
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-fuchsia-500/20" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/3 rounded bg-fuchsia-400/20" />
          <div className="h-3 w-1/4 rounded bg-fuchsia-400/10" />
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-5/6 rounded bg-white/10" />
        <div className="h-3 w-4/6 rounded bg-white/10" />
      </div>
      <div className="mt-6 flex gap-3">
        <div className="h-8 w-24 rounded-lg bg-fuchsia-500/20" />
        <div className="h-8 w-20 rounded-lg bg-white/10" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Animated audio waveform equalizer bars
 */
export function WaveformLoader({ className = "", label }: { className?: string; label?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-end gap-1 h-7">
        {[40, 75, 100, 60, 90, 45, 80, 50, 95, 65].map((height, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-fuchsia-500 to-pink-400 animate-pulse"
            style={{
              height: `${height}%`,
              animationDelay: `${i * 120}ms`,
              animationDuration: "800ms",
            }}
          />
        ))}
      </div>
      {label && <span className="text-xs font-medium text-fuchsia-200/80">{label}</span>}
    </div>
  );
}

/**
 * AI evaluator thinking indicator with floating glowing dots
 */
export function ThinkingDots({ label = "AI is evaluating your response..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-fuchsia-400/30 bg-[#241044]/80 px-4 py-2.5 text-white shadow-[0_0_20px_rgba(236,72,153,0.15)] backdrop-blur">
      <Sparkles size={16} className="text-fuchsia-300 animate-spin" style={{ animationDuration: "3s" }} />
      <span className="text-xs font-semibold text-fuchsia-100">{label}</span>
      <div className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="size-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="size-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

/**
 * Circular spinner with glowing gradient ring
 */
export function CircularSpinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center animate-spin ${className}`}
      style={{ width: size, height: size }}
      role="status"
    >
      <div className="absolute inset-0 rounded-full border-2 border-fuchsia-500/20 border-t-fuchsia-400" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
