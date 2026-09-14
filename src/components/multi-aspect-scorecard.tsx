"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Award, CheckCircle2, ChevronRight, Gauge, Info, Lightbulb, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { ComprehensiveEvaluationResult } from "@/lib/multi-evaluator";
import { ConfidenceCalibrationResult } from "@/lib/confidence-calibration";

interface MultiAspectScorecardProps {
  evaluation: ComprehensiveEvaluationResult;
  calibration?: ConfidenceCalibrationResult | null;
  onOpenCiuTopic?: (topicId: string) => void;
}

export function MultiAspectScorecard({
  evaluation,
  calibration,
  onOpenCiuTopic,
}: MultiAspectScorecardProps) {
  const { scores, overallScore, explanation } = evaluation;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4 font-sans">
      {/* Header with Overall Weighted Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Award size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-900">Multi-Aspect Intelligent Evaluation</h4>
              <span className="rounded bg-indigo-100 text-indigo-900 px-2 py-0.5 text-[10px] font-bold font-mono">
                6 Independent Evaluators
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Weighted aggregation: Tech (35%) · Problem Solving (20%) · Relevance (15%) · Comm (10%) · Struct (10%) · Conf (10%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 font-mono block">Aggregated Score</span>
            <span className="text-2xl font-extrabold text-zinc-900 font-mono">{overallScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
        </div>
      </div>

      {/* 6 Independent Evaluator Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {explanation.weightedBreakdown.map((b) => (
          <div key={b.label} className="rounded-lg bg-zinc-50 p-2.5 border border-zinc-100 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700 truncate">{b.label}</span>
              <span className="font-bold font-mono text-zinc-900">{b.score}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
              <div
                className={`h-full ${
                  b.score >= 75 ? "bg-emerald-500" : b.score >= 60 ? "bg-blue-500" : "bg-amber-500"
                } transition-all duration-300`}
                style={{ width: `${b.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>{b.weightPercent}% weight</span>
              <span>+{b.contribution} pts</span>
            </div>
          </div>
        ))}
      </div>

      {/* Confidence Calibration Diagnostic Card */}
      {calibration && (
        <div
          className={`rounded-xl border p-3.5 space-y-2 text-xs ${
            calibration.status === "Overconfident"
              ? "border-rose-300 bg-rose-50/70 text-rose-950"
              : calibration.status === "Underconfident"
              ? "border-amber-300 bg-amber-50/70 text-amber-950"
              : "border-emerald-300 bg-emerald-50/70 text-emerald-950"
          }`}
        >
          <div className="flex items-center justify-between border-b border-current/20 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold font-mono uppercase tracking-wider">
              {calibration.status === "Overconfident" ? (
                <ShieldAlert size={15} className="text-rose-600" />
              ) : calibration.status === "Underconfident" ? (
                <AlertCircle size={15} className="text-amber-600" />
              ) : (
                <CheckCircle2 size={15} className="text-emerald-600" />
              )}
              <span>Confidence Calibration: {calibration.headline}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>Delivery: {calibration.confidenceScore}%</span>
              <span>·</span>
              <span>Knowledge: {calibration.technicalScore}%</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed opacity-90">{calibration.diagnosis}</p>
          <div className="rounded-md bg-white/80 p-2 border border-current/10 text-[11px] font-mono leading-relaxed">
            <span className="font-bold">Coaching Cue: </span>
            {calibration.coachingAdvice}
          </div>
        </div>
      )}

      {/* Explain Every Score: Done Well vs Missed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* What Was Done Well */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-900 uppercase tracking-wider">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>What You Explained Well</span>
          </div>
          <ul className="space-y-1.5 text-xs text-emerald-950">
            {explanation.whatWasDoneWell.map((well, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{well}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What Was Missed */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-amber-900 uppercase tracking-wider">
            <AlertTriangle size={14} className="text-amber-600" />
            <span>Missing Nuance &amp; Edge Cases</span>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-950">
            {explanation.whatWasMissed.map((missed, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-amber-600 font-bold shrink-0">⚠</span>
                <span>{missed}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Concrete Recommendation Card */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-3 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-indigo-600 shrink-0" />
          <div>
            <span className="font-bold font-mono uppercase text-[10px] text-indigo-800 tracking-wider block">
              CIU Knowledge Graph Recommendation
            </span>
            <span className="text-indigo-950 leading-tight">{explanation.concreteRecommendation}</span>
          </div>
        </div>

        {explanation.matchedCiuTopic && onOpenCiuTopic && (
          <button
            type="button"
            onClick={() => onOpenCiuTopic(explanation.matchedCiuTopic!.id)}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer shrink-0"
          >
            Open Topic Details →
          </button>
        )}
      </div>
    </div>
  );
}
