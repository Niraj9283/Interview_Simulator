"use client";

import React from "react";
import Link from "next/link";
import {
  BrainCircuit,
  Compass,
  ArrowLeft,
  Search,
  Code2,
  Mic,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function NotFound() {
  const triggerSearch = () => {
    // Dispatch Cmd+K event to open site search modal
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  return (
    <div className="relative min-h-[90vh] flex flex-col justify-between px-4 py-8 lg:px-8">
      {/* Top Breadcrumbs */}
      <div className="mx-auto w-full max-w-5xl mb-8">
        <Breadcrumbs items={[{ name: "404 Error", current: true }]} />
      </div>

      {/* Main 404 Hero */}
      <main className="mx-auto w-full max-w-3xl my-auto text-center">
        <div className="relative mx-auto mb-6 grid size-24 place-items-center rounded-3xl border border-[#2A2A2A] bg-[#141414] text-[#FF4D3D] shadow-[0_0_50px_rgba(255,77,61,0.25)]">
          <BrainCircuit size={48} className="animate-pulse" />
          <div className="absolute -inset-2 rounded-3xl bg-[#FF4D3D]/10 blur-xl -z-10" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4D3D]/30 bg-[#FF4D3D]/10 px-3 py-1 text-xs font-mono font-semibold text-[#FF4D3D] mb-4">
          <span className="size-2 rounded-full bg-[#FF4D3D] animate-ping" />
          STATUS 404 // INTERVIEW SESSION NOT FOUND
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#F5F5F5]">
          Lost in the Model Weights?
        </h1>

        <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#A0A0A0] max-w-xl mx-auto">
          The simulation route, evaluation token, or architectural diagram you requested does
          not exist or has been migrated. Check the URL or return to the main simulator.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-5 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/30 transition hover:bg-[#ff3826] active:scale-95"
          >
            <ArrowLeft size={16} />
            Return to Simulator
          </Link>

          <button
            type="button"
            onClick={triggerSearch}
            className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#161616] px-5 py-3 text-sm font-semibold text-[#F5F5F5] transition hover:border-[#FF4D3D]/50 hover:bg-[#1c1c1c] active:scale-95 cursor-pointer"
          >
            <Search size={16} className="text-[#FF4D3D]" />
            Search Modules (⌘K)
          </button>
        </div>

        {/* Quick Links Grid */}
        <div className="mt-14 pt-8 border-t border-[#222222]">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#666666] mb-4">
            Recommended Simulator Destinations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <Link
              href="/#speech-metrics"
              className="group rounded-xl border border-[#222222] bg-[#121212] p-3.5 transition hover:border-[#FF4D3D]/40 hover:bg-[#161616]"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#F5F5F5] group-hover:text-[#FF4D3D] transition">
                <Mic size={14} className="text-[#FF4D3D]" />
                Speech Analytics
              </div>
              <p className="mt-1 text-[11px] text-[#888888]">
                Real-time WPM, pitch variance, and filler word detection.
              </p>
            </Link>

            <Link
              href="/#system-design"
              className="group rounded-xl border border-[#222222] bg-[#121212] p-3.5 transition hover:border-[#FF4D3D]/40 hover:bg-[#161616]"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#F5F5F5] group-hover:text-[#FF4D3D] transition">
                <Compass size={14} className="text-[#FF4D3D]" />
                System Design Canvas
              </div>
              <p className="mt-1 text-[11px] text-[#888888]">
                Distributed systems diagramming with automated feedback.
              </p>
            </Link>

            <Link
              href="/#coding-sandbox"
              className="group rounded-xl border border-[#222222] bg-[#121212] p-3.5 transition hover:border-[#FF4D3D]/40 hover:bg-[#161616]"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#F5F5F5] group-hover:text-[#FF4D3D] transition">
                <Code2 size={14} className="text-[#FF4D3D]" />
                Live Coding Sandbox
              </div>
              <p className="mt-1 text-[11px] text-[#888888]">
                In-browser code execution with complexity benchmarks.
              </p>
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-center text-xs text-[#555555]">
        MockMate AI Autonomous Diagnostic System &bull; Error Reference: ERR_ROUTE_UNRESOLVED
      </footer>
    </div>
  );
}
