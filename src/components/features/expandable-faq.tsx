"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles, Search } from "lucide-react";

export interface FAQItem {
  id: string;
  category: "Speech & Audio" | "Privacy & Edge" | "Evaluation" | "Integrity";
  question: string;
  answer: string;
}

export const FAQS: FAQItem[] = [
  {
    id: "speech-analysis",
    category: "Speech & Audio",
    question: "How does real-time voice, pause, and pace tracking work?",
    answer:
      "MockMate AI analyzes your audio stream locally in real-time using the Web Audio API and SpeechRecognition engines. It continuously computes your Words Per Minute (WPM), speech-to-pause ratios, vocal steadiness, volume (RMS/dB), and counts filler words (e.g. 'um', 'like', 'actually'). Optimal pacing is rated between 120-160 WPM.",
  },
  {
    id: "data-privacy",
    category: "Privacy & Edge",
    question: "Is my resume or camera video uploaded to remote servers?",
    answer:
      "No. In Edge Mode, video gaze estimation via MediaPipe and speech analytics execute 100% locally on your computer inside browser WebAssembly runtimes. When utilizing Cloud Mode for deeper LLM reasoning, your resume text and answers are sent securely over TLS without storing persistent biometric video data.",
  },
  {
    id: "edge-vs-cloud",
    category: "Privacy & Edge",
    question: "What is the difference between Edge AI Mode and Cloud Mode?",
    answer:
      "Edge Mode runs lightweight WebAssembly / ONNX models directly on your CPU/GPU with zero network latency (sub-50ms) and works air-gapped without an internet connection. Cloud Mode taps high-parameter frontier reasoning models for hyper-nuanced technical architectural critique.",
  },
  {
    id: "integrity-shield",
    category: "Integrity",
    question: "How does the Anti-Cheating & Integrity Shield compute my score?",
    answer:
      "The integrity tracker monitors tab switching, window blur events, dual-screen gaze displacement, and unnatural copy-paste clipboard events. Maintaining genuine camera engagement and focusing on the interview workspace yields a 90%+ integrity rating.",
  },
  {
    id: "peer-benchmarks",
    category: "Evaluation",
    question: "How does the Longitudinal Peer Benchmark calculate my percentile?",
    answer:
      "Scores from your communication clarity, technical depth, problem-solving, and resume project alignment are evaluated against anonymized performance distributions of thousands of peer candidates across FAANG, Fortune 500, and top tech companies.",
  },
  {
    id: "multimodal-sandbox",
    category: "Evaluation",
    question: "Can I practice coding and system design in the same session?",
    answer:
      "Yes! MockMate AI supports multi-track interviews. You can transition from verbal behavioral questions to live code editing with real-time test execution in JavaScript/Python, or sketch distributed system topologies on the interactive canvas.",
  },
];

export function ExpandableFAQ() {
  const [openIds, setOpenIds] = useState<string[]>(["speech-analysis"]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Speech & Audio", "Privacy & Edge", "Evaluation", "Integrity"];

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="faq-section" className="w-full space-y-6 pt-4 print:hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-fuchsia-500/20 text-fuchsia-300">
              <HelpCircle size={18} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Learn more about speech tracking, local edge models, and scoring mechanics.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-xl border border-fuchsia-400/20 bg-[#241044]/60 py-2 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 backdrop-blur focus:border-fuchsia-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeCategory === cat
                ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-900/40"
                : "border border-fuchsia-400/20 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-fuchsia-400/20 bg-white/5 p-8 text-center text-xs text-zinc-400">
            No FAQ items match &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-[#241044]/70 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur transition-colors hover:border-fuchsia-400/40"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="flex w-full items-center justify-between p-4 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="rounded bg-fuchsia-500/20 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">
                      {faq.category}
                    </span>
                    <span className="text-sm font-semibold text-white">{faq.question}</span>
                  </div>
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-fuchsia-300 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-fuchsia-500/20 text-white" : ""
                    }`}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${faq.id}`}
                    className="border-t border-fuchsia-400/15 px-4 pb-4 pt-3 text-xs leading-relaxed text-zinc-300 animate-in fade-in duration-200"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
