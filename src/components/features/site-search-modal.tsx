"use client";

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
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search items catalog
  const items: SearchItem[] = useMemo(() => [
    {
      id: "track-ml",
      title: "Machine Learning & AI Track",
      category: "Track",
      description: "Neural architectures, fine-tuning, RAG, and ML deployment questions.",
      icon: BrainCircuit,
      keywords: ["machine learning", "python", "pytorch", "rag", "ai", "deep learning"],
      action: () => {
        onSelectTrack?.("Machine Learning Engineer");
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
        onSelectTrack?.("Full Stack Developer");
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
        onSelectTrack?.("Cloud Architect");
        onClose();
      },
    },
    {
      id: "track-behavioral",
      title: "Behavioral & Leadership",
      category: "Track",
      description: "STAR method scenarios, conflict resolution, and cross-functional leadership.",
      icon: Users,
      keywords: ["behavioral", "hr", "star method", "leadership", "culture fit"],
      action: () => {
        onSelectTrack?.("Product Manager");
        onClose();
      },
    },
    {
      id: "feature-integrity",
      title: "Anti-Cheating & Integrity Shield",
      category: "Feature",
      description: "View multimodal gaze tracking, tab-switching deterrence, and face telemetry.",
      icon: ShieldCheck,
      keywords: ["anti-cheat", "integrity", "eye contact", "gaze", "telemetry"],
      action: () => {
        onOpenIntegrity?.();
        onClose();
      },
    },
    {
      id: "feature-edge",
      title: "Edge AI Architecture & Topology",
      category: "Feature",
      description: "Inspect local WebAssembly models, offline inference latency, and air-gapped setup.",
      icon: Cpu,
      keywords: ["edge", "offline", "wasm", "privacy", "latency", "local model"],
      action: () => {
        onOpenEdgeTopology?.();
        onClose();
      },
    },
    {
      id: "feature-benchmark",
      title: "Longitudinal Benchmark Engine",
      category: "Feature",
      description: "Compare your performance against peer cohorts in tech, finance, and product.",
      icon: TrendingUp,
      keywords: ["benchmark", "percentile", "score", "analytics", "ranking"],
      action: () => {
        onOpenBenchmark?.();
        onClose();
      },
    },
    {
      id: "faq-speech",
      title: "FAQ: How does voice & speech pace analysis work?",
      category: "FAQ",
      description: "Details on live WPM tracking, filler word detection, and vocal steadiness.",
      icon: HelpCircle,
      keywords: ["speech", "voice", "audio", "wpm", "fillers", "microphone"],
      action: () => {
        const el = document.getElementById("faq-section");
        el?.scrollIntoView({ behavior: "smooth" });
        onClose();
      },
    },
    {
      id: "action-scroll-top",
      title: "Scroll to Top",
      category: "Action",
      description: "Quickly return to the top of the interview simulator.",
      icon: ArrowRight,
      keywords: ["top", "scroll", "home"],
      action: () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        onClose();
      },
    },
  ], [onSelectTrack, onOpenEdgeTopology, onOpenIntegrity, onOpenBenchmark, onClose]);

  // Filtered items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        item.keywords?.some((k) => k.toLowerCase().includes(lower))
    );
  }, [items, query]);

  // Reset selectedIndex when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site Search and Command Palette"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#111111]/98 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,77,61,0.15)] backdrop-blur-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-[#222222] px-4 py-3.5">
          <Search size={20} className="text-[#FF4D3D] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search interview tracks, features, FAQs, or shortcuts... (↑↓ to navigate)"
            className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder:text-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[10px] font-mono text-neutral-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              <Sparkles size={28} className="mx-auto mb-2 text-[#FF4D3D]/50" />
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
                  className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#FF4D3D]/10 border border-[#FF4D3D]/40 text-white"
                      : "text-neutral-300 hover:bg-[#181818] border border-transparent"
                  }`}
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[#FF4D3D] text-black shadow-md shadow-[#FF4D3D]/40"
                        : "bg-[#181818] border border-[#262626] text-neutral-400"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-white">
                        {item.title}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          item.category === "Track"
                            ? "bg-[#FF4D3D]/15 text-[#FF4D3D] border border-[#FF4D3D]/20"
                            : item.category === "Feature"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : item.category === "FAQ"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-neutral-400">{item.description}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className={`shrink-0 transition-transform ${
                      isSelected ? "translate-x-1 text-[#FF4D3D]" : "text-transparent"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-[#222222] bg-[#0c0c0c] px-4 py-2.5 text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#262626] bg-[#181818] px-1 py-0.5 text-[10px] font-mono text-neutral-300">↑</kbd>
              <kbd className="rounded border border-[#262626] bg-[#181818] px-1 py-0.5 text-[10px] font-mono text-neutral-300">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#262626] bg-[#181818] px-1.5 py-0.5 text-[10px] font-mono text-neutral-300">↵</kbd>
              to open
            </span>
          </div>
          <span className="text-[10px] text-[#FF4D3D]/80 font-mono">MockMate Search v2.0</span>
        </div>
      </div>
    </div>
  );
}
