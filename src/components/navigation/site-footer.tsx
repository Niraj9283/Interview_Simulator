"use client";

import React from "react";
import Link from "next/link";
import {
  BrainCircuit,
  Sliders,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Lock,
} from "lucide-react";
import { openCookiePreferencesModal } from "@/components/features/cookie-banner";

export function SiteFooter() {

  return (
    <footer
      role="contentinfo"
      className="mt-20 border-t border-[#222222] bg-[#0A0A0A]/95 text-white backdrop-blur-xl print:hidden"
    >
      <div className="mx-auto max-w-[1500px] px-4 py-14 lg:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Edge AI Telemetry Status */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#D9362B] to-[#FF4D3D] text-white shadow-md shadow-[#FF4D3D]/25">
                <BrainCircuit size={20} />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#F5F5F5]">
                MockMate<span className="text-[#FF4D3D]">.AI</span>
              </span>
            </div>

            <p className="max-w-md text-xs leading-relaxed text-[#A0A0A0]">
              Autonomous interview evaluation architecture featuring sub-50ms local speech cadence
              processing, distributed system design canvas, multi-language coding execution, and
              privacy-first edge intelligence.
            </p>

            {/* Edge AI Operational Badge */}
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#222222] bg-[#141414] px-3 py-1.5 text-xs">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-[#A0A0A0]">Edge AI Runtime:</span>
              <span className="font-mono text-[11px] font-semibold text-emerald-400">
                100% Client-Side Ready
              </span>
            </div>

            <div className="pt-2 flex items-center gap-3 text-[#777777]">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="GitHub Repository"
                className="rounded-lg p-2 transition hover:bg-white/5 hover:text-white"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X Profile"
                className="rounded-lg p-2 transition hover:bg-white/5 hover:text-white"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 1: Core Simulator Modules */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5] mb-3">
              Simulator Modules
            </h3>
            <ul className="space-y-2 text-xs text-[#A0A0A0]">
              {[
                { id: "behavioral-star-rubric", name: "Behavioral STAR Rubric" },
                { id: "speech-cadence-analytics", name: "Speech & Cadence Analytics" },
                { id: "system-design-canvas", name: "System Design Canvas" },
                { id: "coding-sandbox", name: "Coding Sandbox" },
                { id: "gaze-integrity-shield", name: "Gaze & Integrity Shield" },
              ].map((mod) => (
                <li key={mod.id}>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("mockmate:open-module", { detail: { moduleId: mod.id } })
                      );
                    }}
                    className="hover:text-white transition cursor-pointer text-left flex items-center gap-1 group"
                  >
                    <span>{mod.name}</span>
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-[#FF4D3D] transition" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Platform & Learning Hub */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5] mb-3">
              Resources & Help
            </h3>
            <ul className="space-y-2 text-xs text-[#A0A0A0]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("mockmate:open-faq"));
                  }}
                  className="hover:text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  <HelpCircle size={13} className="text-[#FF4D3D]" />
                  <span>Interactive FAQ</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("mockmate:open-contact"));
                  }}
                  className="hover:text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={13} className="text-[#FF4D3D]" />
                  <span>Send Feedback & Support</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
                    );
                  }}
                  className="hover:text-white transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Sliders size={13} className="text-[#A0A0A0]" />
                  <span>Quick Search (⌘K)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferencesModal}
                  className="hover:text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Privacy & Cookie Settings</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Privacy, Trust & Preferences */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5] mb-3">
              Trust & Governance
            </h3>
            <ul className="space-y-2 text-xs text-[#A0A0A0]">
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferencesModal}
                  className="flex items-center gap-1.5 text-[#FF4D3D] hover:text-[#ff6a5c] transition cursor-pointer font-medium"
                >
                  <Sliders size={13} />
                  <span>Cookie Preferences</span>
                </button>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition flex items-center gap-1.5"
                >
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Privacy Policy & Telemetry</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition flex items-center gap-1.5"
                >
                  <Lock size={13} className="text-sky-400" />
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/security"
                  className="hover:text-white transition flex items-center gap-1.5"
                >
                  <Sliders size={13} className="text-[#FF4D3D]" />
                  <span>Security & Account Settings</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-white transition"
                >
                  Account Login & Registration
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#1a1a1a] pt-6 sm:flex-row text-xs text-[#666666]">
          <p>&copy; {new Date().getFullYear()} MockMate AI. Built for technical interview excellence.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span>Security Headers Active</span>
            </span>
            <span>&bull;</span>
            <span>Zero Remote Telemetry by Default</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
