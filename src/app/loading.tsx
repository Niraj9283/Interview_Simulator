import React from "react";
import { Skeleton, CardSkeleton, MetricSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto min-h-screen max-w-[1500px] px-4 py-8 lg:px-6 animate-in fade-in duration-300">
      {/* Top Banner Skeleton */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#222222] bg-[#111111]/80 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Grid of Telemetry Metrics Skeletons */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Video & Audio Monitor Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video w-full rounded-2xl border border-[#222222] bg-[#111111]/90 p-4">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
          <CardSkeleton lines={4} />
        </div>

        {/* Right Column: Feedback & Sandbox Cards Skeleton */}
        <div className="space-y-6">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    </div>
  );
}
