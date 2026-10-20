"use client";

import React, { useEffect } from "react";
import { captureAppError } from "@/lib/error-tracking";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureAppError(error, {
      component: "GlobalErrorBoundary",
      action: "critical_layout_exception",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en" data-theme="dark" className="h-full bg-[#080808] text-white">
      <body className="flex min-h-full items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#121212] p-8 text-center space-y-5">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
            <span className="font-mono text-xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold text-white">Application Exception</h1>
          <p className="text-xs text-[#888888] leading-relaxed">
            A critical layout exception occurred. Please reload the application or try again.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-[#555555]">Error ID: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[#FF4D3D] px-6 py-2.5 text-xs font-bold text-neutral-950 hover:bg-[#ff3826] transition"
          >
            Reload Simulator
          </button>
        </div>
      </body>
    </html>
  );
}
