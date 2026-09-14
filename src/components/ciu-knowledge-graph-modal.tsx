"use client";

import React, { useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, ExternalLink, Filter, Search, X, Zap } from "lucide-react";
import { CIUDomain, CIUTopicNode, CIU_KNOWLEDGE_GRAPH, getAllDomains, getTopicsByDomain, searchTopics } from "@/lib/knowledge-graph";

interface CiuKnowledgeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic?: (topic: CIUTopicNode) => void;
}

export function CiuKnowledgeGraphModal({ isOpen, onClose, onSelectTopic }: CiuKnowledgeGraphModalProps) {
  const [selectedDomain, setSelectedDomain] = useState<CIUDomain | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<CIUTopicNode>(CIU_KNOWLEDGE_GRAPH[0]);

  if (!isOpen) return null;

  const domains = getAllDomains();
  let displayedTopics = selectedDomain === "All" ? CIU_KNOWLEDGE_GRAPH : getTopicsByDomain(selectedDomain);
  if (searchQuery.trim()) {
    displayedTopics = searchTopics(searchQuery).filter(
      (t) => selectedDomain === "All" || t.domain === selectedDomain
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-cyan-500/30 bg-zinc-950 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Coding Interview University (CIU) Knowledge Graph</h2>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-300 border border-cyan-500/30">
                  {CIU_KNOWLEDGE_GRAPH.length} Master Topics
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Hierarchical computer science curriculum serving as MockMate AI&apos;s adaptive intelligence layer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/50 px-6 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDomain("All")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedDomain === "All"
                  ? "bg-cyan-500 text-zinc-950 shadow-sm"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              All Domains ({CIU_KNOWLEDGE_GRAPH.length})
            </button>
            {domains.map((dom) => {
              const count = getTopicsByDomain(dom).length;
              return (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setSelectedDomain(dom)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    selectedDomain === dom
                      ? "bg-cyan-500 text-zinc-950 shadow-sm"
                      : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {dom} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search concepts, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Two-Pane Topic Browser */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Topic List */}
          <div className="w-1/3 border-r border-zinc-800 overflow-y-auto p-4 space-y-2">
            {displayedTopics.map((topic) => {
              const isSelected = activeTopic.id === topic.id;
              return (
                <div
                  key={topic.id}
                  onClick={() => setActiveTopic(topic)}
                  className={`flex flex-col gap-1 rounded-xl p-3 border transition cursor-pointer ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-950/40 text-white shadow-sm"
                      : "border-zinc-800/80 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white truncate">{topic.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-bold ${
                        topic.difficulty === "easy"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : topic.difficulty === "medium"
                          ? "bg-amber-500/20 text-amber-300"
                          : topic.difficulty === "hard"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {topic.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{topic.subdomain}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">{topic.keyConcepts.length} concepts</span>
                  </div>
                </div>
              );
            })}
            {displayedTopics.length === 0 && (
              <div className="text-center py-10 text-xs text-zinc-500">
                No topics matched your query.
              </div>
            )}
          </div>

          {/* Right Topic Details */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTopic && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                      {activeTopic.domain} · {activeTopic.subdomain}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${
                        activeTopic.difficulty === "easy"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : activeTopic.difficulty === "medium"
                          ? "bg-amber-500/20 text-amber-300"
                          : activeTopic.difficulty === "hard"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {activeTopic.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{activeTopic.name}</h3>
                  <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{activeTopic.description}</p>
                </div>

                {/* Key Concepts */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
                    <Zap size={14} />
                    <span>Mastery Concepts Evaluated</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {activeTopic.keyConcepts.map((concept) => (
                      <div key={concept} className="flex items-start gap-2 rounded-lg bg-zinc-950/80 p-2 border border-zinc-800/80">
                        <CheckCircle2 size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-200">{concept}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prerequisites & Required Skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                    <span className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wider">
                      Prerequisites
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeTopic.prerequisites.map((p) => (
                        <span key={p} className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-xs font-mono text-amber-200">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                    <span className="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wider">
                      Target Interview Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeTopic.skills.map((s) => (
                        <span key={s} className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs font-mono text-emerald-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Interview Questions */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                  <span className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
                    Adaptive Question Bank Samples
                  </span>
                  <div className="space-y-2">
                    {activeTopic.sampleQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 rounded-lg bg-zinc-950/80 p-3 border border-zinc-800/80 text-xs text-zinc-200 leading-relaxed">
                        <span className="rounded bg-purple-500/20 text-purple-300 px-1.5 py-0.5 text-[10px] font-mono font-bold shrink-0">
                          Q{idx + 1}
                        </span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rubric: Strong signals vs Red flags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-2">
                    <span className="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wider">
                      ✓ Strong Signals (Senior Caliber)
                    </span>
                    <ul className="space-y-1.5 text-xs text-emerald-100/90 list-disc pl-4">
                      {activeTopic.evaluationRubric.strongSignals.map((sig, i) => (
                        <li key={i}>{sig}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 space-y-2">
                    <span className="text-xs font-bold font-mono text-rose-300 uppercase tracking-wider">
                      ⚠ Red Flags (Common Traps)
                    </span>
                    <ul className="space-y-1.5 text-xs text-rose-100/90 list-disc pl-4">
                      {activeTopic.evaluationRubric.redFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CIU Reference link & Practice CTA */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                  <a
                    href={activeTopic.ciuReferenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <span>View Coding Interview University Reference</span>
                    <ExternalLink size={13} />
                  </a>

                  {onSelectTopic && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTopic(activeTopic);
                        onClose();
                      }}
                      className="rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-zinc-950 shadow-sm transition cursor-pointer"
                    >
                      Target This Topic in Next Round →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
