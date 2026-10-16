"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, X, RotateCcw } from "lucide-react";

interface FormSuccessStateProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function FormSuccessState({
  title = "Success!",
  message,
  onDismiss,
  onAction,
  actionLabel,
  className = "",
}: FormSuccessStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.15)] backdrop-blur animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 shadow-sm">
          <CheckCircle2 size={20} className="animate-in zoom-in-50 duration-200" />
        </div>
        <div className="flex-1 space-y-1">
          {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
          <p className="text-xs leading-relaxed text-emerald-200/90">{message}</p>
          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-500/20 hover:text-white transition cursor-pointer"
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

interface FormErrorStateProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function FormErrorState({
  title = "Action Failed",
  message,
  onDismiss,
  onRetry,
  retryLabel = "Try Again",
  className = "",
}: FormErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`relative overflow-hidden rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.15)] backdrop-blur animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/20 text-rose-400 shadow-sm">
          <AlertTriangle size={20} className="animate-bounce" style={{ animationIterationCount: 2 }} />
        </div>
        <div className="flex-1 space-y-1">
          {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
          <p className="text-xs leading-relaxed text-rose-200/90">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 cursor-pointer"
            >
              <RotateCcw size={12} />
              {retryLabel}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-rose-400 hover:bg-rose-500/20 hover:text-white transition cursor-pointer"
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
