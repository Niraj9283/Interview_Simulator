"use client";

import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-skeleton rounded-lg bg-white/5 border border-white/5 ${className}`}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Shimmer Card Skeleton with title and multi-line body
 */
export function CardSkeleton({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#222222] bg-[#111111]/90 p-5 backdrop-blur-xl ${className}`}
      role="status"
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3 ${
              i === lines - 1 ? "w-4/6" : i % 2 === 1 ? "w-5/6" : "w-full"
            }`}
          />
        ))}
      </div>
      <span className="sr-only">Loading card content...</span>
    </div>
  );
}

/**
 * Numerical Metric Card Skeleton
 */
export function MetricSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-[#222222] bg-[#141414] p-4 ${className}`}
      role="status"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-5 rounded-md" />
      </div>
      <Skeleton className="h-8 w-24 rounded-lg mt-1" />
      <Skeleton className="h-2.5 w-32 mt-1" />
      <span className="sr-only">Loading metric...</span>
    </div>
  );
}

/**
 * Code Editor lines shimmer skeleton
 */
export function CodeEditorSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[#262626] bg-[#0c0c0c] p-4 font-mono ${className}`}
      role="status"
    >
      <div className="flex items-center justify-between border-b border-[#222] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-red-500/40" />
          <span className="size-2.5 rounded-full bg-yellow-500/40" />
          <span className="size-2.5 rounded-full bg-green-500/40" />
          <Skeleton className="h-3 w-28 ml-2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <div className="space-y-2.5 pt-2">
        <Skeleton className="h-3.5 w-1/4" />
        <Skeleton className="h-3.5 w-1/2 ml-4" />
        <Skeleton className="h-3.5 w-3/5 ml-4" />
        <Skeleton className="h-3.5 w-1/3 ml-8" />
        <Skeleton className="h-3.5 w-2/3 ml-4" />
        <Skeleton className="h-3.5 w-1/6" />
      </div>
      <span className="sr-only">Loading code environment...</span>
    </div>
  );
}
