"use client";

import React from "react";
import { ArrowDown, ArrowUp, Award, Calendar, CheckCircle2, ChevronRight, Clock3, Gauge, History, Target, TrendingUp, Trophy, X, Zap } from "lucide-react";
import { ReadinessProgressSummary, StoredInterviewSession } from "@/lib/interview-history";

interface InterviewReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  readinessSummary: ReadinessProgressSummary;
  sessions: StoredInterviewSession[];
  onSelectSession?: (session: StoredInterviewSession) => void;
}

export function InterviewReadinessModal({
  isOpen,
  onClose,
  readinessSummary,
  sessions,
  onSelectSession,
}: InterviewReadinessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-emerald-500/30 bg-zinc-950 text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Interview Readiness & Progression Dashboard</h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-emerald-300 border border-emerald-500/30">
                  {readinessSummary.recommendationBadge}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Measures actual longitudinal performance across interviews, domain benchmarks, and persistent session history.
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
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Box 1: Overall Readiness */}
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                <span>Interview Readiness</span>
                <Trophy size={14} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{readinessSummary.overallReadiness}</span>
                <span className="text-xs text-zinc-400 font-mono">/ 100 Index</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {readinessSummary.deltaVsPrevious >= 0 ? (
                  <span className="flex items-center gap-0.5 text-emerald-400 font-bold font-mono">
                    <ArrowUp size={13} />
                    +{readinessSummary.deltaVsPrevious} pts vs previous
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-rose-400 font-bold font-mono">
                    <ArrowDown size={13} />
                    {readinessSummary.deltaVsPrevious} pts vs previous
                  </span>
                )}
              </div>
            </div>

            {/* Box 2: Latest Performance */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <span>Latest Session Score</span>
                <Gauge size={14} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{readinessSummary.latestScore}</span>
                <span className="text-xs text-zinc-400 font-mono">/ 100</span>
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                Historical Avg: <span className="font-bold text-white">{readinessSummary.averageScore}</span>
              </div>
            </div>

            {/* Box 3: Total Completed Sessions */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <span>Interviews Completed</span>
                <History size={14} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{readinessSummary.totalSessionsCompleted}</span>
                <span className="text-xs text-zinc-400 font-mono">Sessions</span>
              </div>
              <div className="text-xs text-emerald-400 font-mono">
                Longitudinal Tracking Active
              </div>
            </div>

            {/* Box 4: Critical Gap to Close */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                <span>Priority Focus Area</span>
                <Target size={14} />
              </div>
              <div className="text-sm font-bold text-amber-200 truncate">
                {readinessSummary.criticalGapsToReview[0] || "Foundations Solid"}
              </div>
              <div className="text-xs text-zinc-400">
                Recommended in 7-Day Plan
              </div>
            </div>
          </div>

          {/* Domain Readiness Breakdown */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                Readiness Across Core Computer Science Competencies
              </span>
              <span className="text-xs font-mono text-zinc-400">CIU Evaluator Weights</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
              {[
                { label: "Data Structures & Algorithms (DSA)", score: readinessSummary.domainReadiness.dsa, weight: "25%" },
                { label: "Distributed System Design", score: readinessSummary.domainReadiness.systemDesign, weight: "20%" },
                { label: "Communication & Articulation", score: readinessSummary.domainReadiness.communication, weight: "20%" },
                { label: "Database Internals & Storage (DBMS)", score: readinessSummary.domainReadiness.dbms, weight: "15%" },
                { label: "Operating Systems & Concurrency", score: readinessSummary.domainReadiness.os, weight: "10%" },
                { label: "Computer Networking & Protocols", score: readinessSummary.domainReadiness.networking, weight: "10%" },
              ].map((item) => (
                <div key={item.label} className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{item.weight} weight</span>
                      <span
                        className={`font-bold min-w-8 text-right ${
                          item.score >= 75 ? "text-emerald-400" : item.score >= 60 ? "text-blue-400" : "text-amber-400"
                        }`}
                      >
                        {item.score}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        item.score >= 75 ? "bg-emerald-500" : item.score >= 60 ? "bg-blue-500" : "bg-amber-500"
                      } transition-all duration-500`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Persistent Interview History Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
                Interview Session History ({sessions.length} Recorded)
              </span>
              <span className="text-xs font-mono text-zinc-400">Stores Transcripts, Scores &amp; Weaknesses</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/80 text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Company &amp; Role</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Overall Score</th>
                    <th className="py-2.5 px-3">Key Weakness Identified</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {sessions.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-zinc-900/50 transition">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                          #{sessions.length - idx}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">
                        {new Date(s.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white">{s.targetCompany}</span> · {s.targetRole}
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300">
                          {s.interviewMode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold rounded px-2 py-0.5 ${
                            s.overallScore >= 75
                              ? "bg-emerald-500/20 text-emerald-300"
                              : s.overallScore >= 65
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {s.overallScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-rose-300/90 truncate max-w-xs">
                        {s.weakAreas[0] || "None detected"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectSession && onSelectSession(s)}
                          className="rounded bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition cursor-pointer"
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
