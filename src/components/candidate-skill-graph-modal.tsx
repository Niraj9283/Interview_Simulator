"use client";

import React from "react";
import { AlertTriangle, Award, CheckCircle2, ChevronRight, Fingerprint, Target, TrendingUp, X, Zap } from "lucide-react";
import { CandidateSkillGraph, SkillNode } from "@/lib/resume-skill-graph";

interface CandidateSkillGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillGraph: CandidateSkillGraph;
  onSelectPriorityTopic?: (topicName: string) => void;
}

export function CandidateSkillGraphModal({
  isOpen,
  onClose,
  skillGraph,
  onSelectPriorityTopic,
}: CandidateSkillGraphModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-pink-500/30 bg-zinc-950 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Fingerprint size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Candidate Resume Skill Graph</h2>
                <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-pink-300 border border-pink-500/30">
                  {skillGraph.overallSkillScore}% Verification Index
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Mapped against CIU Curriculum · Detects technical strengths, verified competencies, and foundational knowledge gaps.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Identified Skills</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{skillGraph.totalSkillsDetected}</span>
                <span className="text-xs font-mono text-emerald-400">Parsed & Indexed</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-1">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={13} />
                Verified Strengths
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-emerald-300">{skillGraph.strengths.length}</span>
                <span className="text-xs text-emerald-200/80 truncate">{skillGraph.strengths.slice(0, 2).join(", ")}</span>
              </div>
            </div>

            <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-4 space-y-1">
              <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={13} />
                Knowledge Gaps (Weaknesses)
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-rose-300">{skillGraph.weaknesses.length}</span>
                <span className="text-xs text-rose-200/80 truncate">{skillGraph.weaknesses.slice(0, 2).join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Priority Interview Probing Targets */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-amber-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-amber-300 uppercase tracking-wider">
                <Target size={15} />
                <span>Interviewer Priority Focus Queue (Gaps Targeted First)</span>
              </div>
              <span className="text-[11px] text-zinc-400">Proactively targets unverified topics</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {skillGraph.priorityInterviewTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onSelectPriorityTopic && onSelectPriorityTopic(topic)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <span>{topic}</span>
                  <ChevronRight size={13} className="text-amber-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Skill Graph Bars */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                Candidate Competency Vectors vs CIU Baseline
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-400" /> Strong (&gt;=75%)
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="size-2 rounded-full bg-blue-400" /> Competent (50-74%)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="size-2 rounded-full bg-rose-400" /> Weakness (&lt;50%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
              {skillGraph.skills.map((skill) => {
                const barColor = skill.isWeakness
                  ? "bg-rose-500"
                  : skill.proficiencyPercent >= 75
                  ? "bg-emerald-500"
                  : "bg-blue-500";

                return (
                  <div key={skill.name} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{skill.name}</span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                          {skill.category}
                        </span>
                        {skill.isWeakness && (
                          <span className="rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.2 text-[10px] font-bold font-mono">
                            Gap
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">{skill.status}</span>
                        <span className="font-bold font-mono text-white min-w-8 text-right">
                          {skill.proficiencyPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${skill.proficiencyPercent}%` }}
                      />
                    </div>

                    {skill.evidenceText && (
                      <p className="text-[10px] text-zinc-500 italic truncate">{skill.evidenceText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CIU Domain Coverage Overview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
              CIU Core CS Domain Coverage
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {skillGraph.domainCoverage.map((dom) => (
                <div key={dom.domain} className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">{dom.domain}</span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        dom.proficiencyPercent >= 70
                          ? "text-emerald-400"
                          : dom.proficiencyPercent >= 45
                          ? "text-blue-400"
                          : "text-rose-400"
                      }`}
                    >
                      {dom.proficiencyPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        dom.proficiencyPercent >= 70
                          ? "bg-emerald-500"
                          : dom.proficiencyPercent >= 45
                          ? "bg-blue-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${dom.proficiencyPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {dom.skillsIdentified.length > 0
                      ? `Skills: ${dom.skillsIdentified.join(", ")}`
                      : "No verified skills"}
                  </div>
                  {dom.gapTopics.length > 0 && (
                    <div className="text-[10px] text-rose-300/80 font-mono truncate">
                      Gaps: {dom.gapTopics.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
