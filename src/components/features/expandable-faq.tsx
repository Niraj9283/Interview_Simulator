"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import { FAQS, FAQItem } from "@/lib/faq-data";

export { FAQS };
export type { FAQItem };

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
      <section id="faq-section" className="w-full space-y-6 pt-6 print:hidden">
        {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
            <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
                      <HelpCircle size={16} />
                    </div>
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                        Frequently Asked Questions
                      </h2>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Answers regarding real-time vocal cadence, on-device Edge RAG, and multi-axis scoring.
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Filter questions"
                    placeholder="Filter questions..."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 py-2 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-lg px-3 py-2 text-xs ${activeCategory === cat
                            ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                            : "border border-zinc-800/80 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                        }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      <div className="space-y-2.5">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-xs text-zinc-400">
            No questions match &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-900/50 transition-colors hover:border-zinc-700"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="flex w-full items-center justify-between p-4 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                      {faq.category}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{faq.question}</span>
                  </div>
                  <div
                    className={`grid size-6 shrink-0 place-items-center rounded border border-zinc-800 bg-zinc-950 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-zinc-100 border-zinc-700" : ""
                    }`
                }
                >
                    <ChevronDown size={14} />
                  </div>
            </button>

            {isOpen && (
              <div
                id={`faq-answer-${faq.id}`}
                className="border-t border-zinc-800/60 bg-zinc-950/40 px-4 pb-4 pt-3 text-xs leading-relaxed text-zinc-400"
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
