"use client";

import React from "react";

export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border-2 focus:border-fuchsia-400 focus:bg-[#1f0a38] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-[0_0_30px_rgba(217,70,239,0.8)] focus:outline-none transition-all print:hidden"
    >
      Skip to main content
    </a>
  );
}
