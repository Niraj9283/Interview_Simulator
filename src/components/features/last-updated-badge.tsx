"use client";

import React, { useEffect, useState } from "react";
import { Clock, Calendar } from "lucide-react";

interface LastUpdatedBadgeProps {
  timestamp?: number | Date | string;
  prefix?: string;
  className?: string;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSec < 5) return "Just now";
  if (diffInSec < 60) return `${diffInSec}s ago`;
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function LastUpdatedBadge({
  timestamp,
  prefix = "Last updated",
  className = "",
}: LastUpdatedBadgeProps) {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const targetDate = React.useMemo(() => {
    if (!timestamp) return new Date();
    return typeof timestamp === "number" || typeof timestamp === "string"
      ? new Date(timestamp)
      : timestamp;
  }, [timestamp]);
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTime(getRelativeTime(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#151515]/90 px-3 py-1 text-xs text-neutral-300 shadow-sm backdrop-blur transition-all ${className}`}
      title={mounted ? `Timestamp: ${targetDate.toLocaleString()}` : "Timestamp"}
    >
      <span className="size-2 rounded-full bg-[#FF4D3D] shrink-0 shadow-[0_0_8px_rgba(255,77,61,0.6)]" />
      <Clock size={13} className="text-[#FF4D3D] shrink-0" />
      <span className="font-normal text-neutral-400">
        {prefix}: <span className="font-semibold text-[#F5F5F5]">{mounted ? relativeTime : "Just now"}</span>
      </span>
    </div>
  );
}
