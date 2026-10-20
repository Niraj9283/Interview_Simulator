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
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#2A2A2A] bg-[#121212]/95 p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FF4D3D]/10 border border-[#FF4D3D]/30 text-[#FF4D3D] shadow-lg shadow-[#FF4D3D]/20">
          <BrainCircuit size={32} />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/20 px-3 py-1 text-xs font-semibold text-red-400 mb-3">
            <AlertCircle size={13} />
            <span>Application State Exception</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Unexpected Simulation Error
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
            The interview simulator encountered an unhandled condition while processing
            telemetry or rendering audio components. No data has been lost.
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] px-6 py-2.5 text-xs font-bold text-neutral-950 shadow-md shadow-[#FF4D3D]/25 hover:bg-[#ff3826] transition cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#161616] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#202020] transition"
          >
            <Home size={14} />
            <span>Return to Simulator</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
