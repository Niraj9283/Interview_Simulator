"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home, BrainCircuit } from "lucide-react";
import { captureAppError } from "@/lib/error-tracking";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture error with correlation ID and scrubbed metadata
    captureAppError(error, {
      component: "NextAppErrorBoundary",
      action: "render_exception",
      metadata: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[68vh] items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg rounded-xl border border-line bg-white p-8 text-center shadow-sm space-y-6">
        <div className="mx-auto grid size-16 place-items-center rounded-xl bg-moss/10 border border-moss/30 text-moss shadow-lg ">
          <BrainCircuit size={32} />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800 mb-3">
            <AlertCircle size={13} />
            <span>Application error</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            The simulator could not load
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
            Try loading the simulator again or return to the home page.
          </p>
          {error.digest && (
            <p className="mt-3 text-[11px] font-mono text-[#666666]">
              Reference ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-moss px-6 py-2.5 text-xs font-semibold text-white shadow-md  hover:bg-moss transition cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 py-2.5 text-xs font-semibold text-ink hover:bg-paper transition"
          >
            <Home size={14} />
            <span>Return to Simulator</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
