"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Search,
  Code2,
  Mic,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default function NotFound() {
  const triggerSearch = () => {
    // Dispatch Cmd+K event to open site search modal
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  return (
    <div className="relative min-h-[68vh] flex flex-col justify-between px-4 py-8 lg:px-8">
      {/* Top Breadcrumbs */}
      <div className="mx-auto w-full max-w-5xl mb-8">
        <Breadcrumbs items={[{ name: "404 Error", current: true }]} />
      </div>

      {/* Main 404 Hero */}
      <section className="mx-auto w-full max-w-3xl my-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-moss/30 bg-moss/10 px-3 py-1 text-xs font-mono font-semibold text-moss mb-4">
          <span className="size-2 rounded-full bg-moss" />
          Error 404
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-ink">
          Page not found
        </h1>

        <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted max-w-xl mx-auto">
          Check the address or return to interview practice.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-moss px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-moss active:scale-95"
          >
            <ArrowLeft size={16} />
            Return to Simulator
          </Link>

          <button
            type="button"
            onClick={triggerSearch}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-moss/50 hover:bg-paper active:scale-95 cursor-pointer"
          >
            <Search size={16} className="text-moss" />
            Search Modules (⌘K)
          </button>
        </div>

        {/* Quick Links Grid */}
        <div className="mt-14 pt-8 border-t border-line">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#666666] mb-4">
            Explore practice tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "speech-cadence-analytics" } }))}
              className="group text-left rounded-xl border border-line bg-white p-3.5 transition hover:border-moss/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-ink group-hover:text-moss transition">
                <Mic size={14} className="text-moss" />
                Speech Analytics
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Real-time WPM, pitch variance, and filler word detection.
              </p>
            </button>

            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "system-design-canvas" } }))}
              className="group text-left rounded-xl border border-line bg-white p-3.5 transition hover:border-moss/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-ink group-hover:text-moss transition">
                <Compass size={14} className="text-moss" />
                System Design Canvas
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Distributed systems diagramming with automated feedback.
              </p>
            </button>

            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "coding-sandbox" } }))}
              className="group text-left rounded-xl border border-line bg-white p-3.5 transition hover:border-moss/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-ink group-hover:text-moss transition">
                <Code2 size={14} className="text-moss" />
                Live Coding Sandbox
              </div>
              <p className="mt-1 text-[11px] text-muted">
                In-browser code execution with complexity benchmarks.
              </p>
            </button>
          </div>
        </div>
      </section>


    </div>
  );
}
