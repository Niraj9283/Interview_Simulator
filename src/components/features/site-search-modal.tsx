"use client";

import { useRouter } from "next/navigation";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  X,
  Code2,
  BrainCircuit,
  Monitor,
  Activity,
  Users,
  ShieldCheck,
  Cpu,
  BookOpen,
  ArrowRight,
  TrendingUp,
  FileText,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  category: "Track" | "Feature" | "Action" | "FAQ";
  description: string;
  icon: typeof Search;
  action: () => void;
  keywords?: string[];
}

interface SiteSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack?: (track: string) => void;
  onOpenEdgeTopology?: () => void;
  onOpenIntegrity?: () => void;
  onOpenBenchmark?: () => void;
}

export function SiteSearchModal({
  isOpen,
  onClose,
  onSelectTrack,
  onOpenEdgeTopology,
  onOpenIntegrity,
  onOpenBenchmark,
}: SiteSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const dialogRef = useDialogFocus(isOpen);

  // Search items catalog
  const items: SearchItem[] = useMemo(() => [
    {
      id: "track-ml",
      title: "Machine Learning & AI Track",
      category: "Track",
      description: "Set up a technical profile for machine learning interview questions.",
      icon: BrainCircuit,
      keywords: ["machine learning", "python", "pytorch", "rag", "ai", "deep learning"],
      action: () => {
        if (onSelectTrack) onSelectTrack("Machine Learning Engineer");
        else router.push("/onboarding");
        onClose();
      },
    },
    {
      id: "track-dsa",
      title: "Data Structures & Algorithms (DSA)",
      category: "Track",
      description: "Interactive coding editor with runtime unit tests and Big-O evaluation.",
      icon: Code2,
      keywords: ["coding", "leetcode", "dsa", "algorithms", "array", "graph", "dynamic programming"],
      action: () => {
        if (onSelectTrack) onSelectTrack("Full Stack Developer");
        else window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "coding-sandbox" } }));
        onClose();
      },
    },
    {
      id: "track-system-design",
      title: "System Design Canvas",
      category: "Track",
      description: "Distributed architecture whiteboard: load balancers, caching, microservices.",
      icon: Monitor,
      keywords: ["system design", "scalability", "architecture", "microservices", "redis", "kafka"],
      action: () => {
        if (onSelectTrack) onSelectTrack("Cloud Architect");
        else window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "system-design-canvas" } }));
        onClose();
      },
    },
    {
      id: "track-behavioral",
      title: "Behavioral STAR Assessment",
      category: "Track",
      description: "Evaluation against Situation, Task, Action, Result framework.",
      icon: Users,
      keywords: ["behavioral", "star", "leadership", "management", "hr", "conflict"],
      action: () => {
        if (onSelectTrack) onSelectTrack("Engineering Manager");
        else window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "behavioral-star-rubric" } }));
        onClose();
      },
    },
    {
      id: "feat-speech",
      title: "Speech & Cadence Forensics",
      category: "Feature",
      description: "Local Web Audio analysis for WPM, pause patterns, steadiness, and filler words.",
      icon: Activity,
      keywords: ["voice", "speech", "cadence", "wpm", "filler words", "audio", "pace"],
      action: () => {
        window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "speech-cadence-analytics" } }));
        onClose();
      },
    },
    {
      id: "feat-edge",
      title: "Edge AI Architecture & Zero Biometrics",
      category: "Feature",
      description: "Explore on-device WebAssembly execution and zero remote video storage.",
      icon: Cpu,
      keywords: ["edge", "privacy", "onnx", "wasm", "client-side", "biometrics", "architecture"],
      action: () => {
        if (onOpenEdgeTopology) onOpenEdgeTopology();
        onClose();
      },
    },
    {
      id: "feat-integrity",
      title: "Gaze & Integrity Shield",
      category: "Feature",
      description: "Real-time MediaPipe eye contact and anti-cheat tracking telemetry.",
      icon: ShieldCheck,
      keywords: ["integrity", "gaze", "eye contact", "camera", "proctoring", "anti-cheating"],
      action: () => {
        if (onOpenIntegrity) onOpenIntegrity();
        onClose();
      },
    },
    {
      id: "feat-benchmark",
      title: "Peer Percentile Benchmarking",
      category: "Feature",
      description: "Compare communication, technical, and behavioral performance to peer candidates.",
      icon: TrendingUp,
      keywords: ["benchmark", "percentile", "score", "growth", "progression", "cohort"],
      action: () => {
        if (onOpenBenchmark) onOpenBenchmark();
        onClose();
      },
    },
    {
      id: "action-onboarding",
      title: "Setup & Onboarding Wizard",
      category: "Action",
      description: "Configure candidate name, target role, department, and default resume.",
      icon: BookOpen,
      keywords: ["setup", "onboarding", "wizard", "profile", "preferences", "guide"],
      action: () => {
        router.push("/onboarding");
        onClose();
      },
    },
  {
    id: "faq-privacy",
      title: "FAQ: Is my camera video uploaded?",
        category: "FAQ",
          description: "Learn how local MediaPipe processing guarantees zero video storage.",
            icon: HelpCircle,
              keywords: ["faq", "privacy", "video", "upload", "security", "gdpr"],
                action: () => {
                  window.dispatchEvent(new CustomEvent("mockmate:open-faq"));
                  onClose();
                },
    },
  ], [onSelectTrack, onOpenEdgeTopology, onOpenIntegrity, onOpenBenchmark, router, onClose]);

  // Filter items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
}, [items, query]);

// Focus input on open
useEffect(() => {
  if (isOpen) {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }
}, [isOpen]);

const handleClose = () => {
  setQuery("");
  setSelectedIndex(0);
  onClose();
};

const activeIndex = selectedIndex >= filtered.length ? 0 : selectedIndex;

// Keyboard navigation
useEffect(() => {
  if (!isOpen) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && document.activeElement === inputRef.current) {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].action();
        handleClose();
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isOpen, filtered, activeIndex]);

if (!isOpen) return null;

return (
  <div
    className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 print:hidden"
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-label="Site Search and Command Palette"
  >
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={handleClose}
    />

    {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-0 shadow-2xl">
        {/* Search Input Bar */}
          <div className="flex items-center gap-3 border-b border-zinc-850 px-4 py-3">
            <Search size={16} className="text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              aria-label="Search the platform"
              placeholder="Search tracks, capabilities, FAQs, or actions... (↑↓ to navigate)"
              className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedIndex(0);
                }}
                aria-label="Clear search"
                className="text-zinc-400 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            )}
              <kbd className="hidden sm:inline-block rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                ESC
              </kbd>
          </div>

          {/* Results List */}
          <div
            ref={resultsRef}
            className="max-h-[55vh] overflow-y-auto p-2"
          >
            {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <Sparkles size={20} className="mx-auto mb-2 text-zinc-600" />
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-800"
                      : "text-zinc-300 hover:bg-zinc-900/50 border border-transparent"
                  }`}
                >
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded border transition-colors ${
                      isSelected
                        ? "bg-zinc-100 border-zinc-100 text-zinc-950 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-zinc-200">
                        {item.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-medium uppercase tracking-wider ${
                          item.category === "Track"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : item.category === "Feature"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : item.category === "FAQ"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-zinc-500">{item.description}</p>
                  </div>
                  <ArrowRight
                    size={13}
                    className={`shrink-0 transition-transform ${
                      isSelected ? "translate-x-0.5 text-zinc-200" : "text-transparent"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-zinc-850 bg-zinc-950 px-4 py-2.5 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.2 text-[9px] font-mono text-zinc-400">↑</kbd>
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0.2 text-[9px] font-mono text-zinc-400">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">↵</kbd>
              to select
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">MockMate Search</span>
        </div>
      </div>
    </div>
            );
}
