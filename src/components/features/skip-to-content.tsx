"use client";

import React from "react";

export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border-2 focus:border-signal focus:bg-moss focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-sm focus:outline-none transition-all print:hidden"
    >
      Skip to main content
    </a>
  );
}
