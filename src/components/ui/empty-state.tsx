"use client";

import React from "react";
import {
  Inbox,
  Code2,
  Search,
  MessageSquareOff,
  History,
  RotateCcw,
  LucideIcon,
} from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  badge?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  badge,
  title,
  description,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2A2A] bg-[#111111]/60 px-6 py-12 text-center backdrop-blur-sm ${className}`}
    >
      <div className="relative mb-4">
        <div className="grid size-14 place-items-center rounded-2xl border border-[#2A2A2A] bg-[#181818] text-[#FF4D3D] shadow-inner shadow-black/50">
          <Icon size={26} />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-[#FF4D3D]/10 blur-md -z-10" />
      </div>

      {badge && (
        <span className="mb-2 rounded-full border border-[#FF4D3D]/30 bg-[#FF4D3D]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FF4D3D]">
          {badge}
        </span>
      )}

      <h3 className="text-base font-bold text-[#F5F5F5]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#A0A0A0]">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-4 py-2 text-xs font-bold text-neutral-950 shadow-md shadow-[#FF4D3D]/25 transition hover:bg-[#ff3826] active:scale-95 cursor-pointer"
        >
          <RotateCcw size={14} />
          {actionText}
        </button>
      )}
    </div>
  );
}

export function EmptyTranscripts({ onStart }: { onStart?: () => void }) {
  return (
    <EmptyState
      icon={MessageSquareOff}
      badge="No Turn Transcripts"
      title="Awaiting Interview Speech"
      description="Start answering questions using your microphone or keyboard to generate live phonetic analysis and sentiment telemetry."
      actionText={onStart ? "Start Answering" : undefined}
      onAction={onStart}
    />
  );
}

export function EmptyInterviewHistory({ onNewSession }: { onNewSession?: () => void }) {
  return (
    <EmptyState
      icon={History}
      badge="Clean Slate"
      title="No Past Interview Attempts"
      description="You haven't completed any mock sessions yet. Complete your first technical or behavioral round to unlock telemetry benchmark percentiles."
      actionText={onNewSession ? "Begin First Simulation" : undefined}
      onAction={onNewSession}
    />
  );
}

export function EmptyCodeOutput({ onRun }: { onRun?: () => void }) {
  return (
    <EmptyState
      icon={Code2}
      badge="Sandbox Idle"
      title="No Code Execution Output"
      description="Execute your algorithm against sample test vectors to inspect standard output, memory footprint, and asymptotic analysis."
      actionText={onRun ? "Run Code" : undefined}
      onAction={onRun}
    />
  );
}

export function EmptySearchResults({ query, onReset }: { query: string; onReset?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      badge="Zero Matches"
      title={`No results found for "${query}"`}
      description="Try searching with broader terms like 'audio latency', 'STAR method', 'system design', or 'Docker'."
      actionText={onReset ? "Clear Search" : undefined}
      onAction={onReset}
    />
  );
}
