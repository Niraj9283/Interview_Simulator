"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(item: Omit<ToastItem, "id">): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = item.duration ?? 4500;
    const newToast: ToastItem = { ...item, id, duration };

    // Max 4 concurrent toasts
    if (this.toasts.length >= 4) {
      this.toasts.shift();
    }

    this.toasts.push(newToast);
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toastManager = new ToastManager();

export const toast = {
  success: (message: string, title = "Success") =>
    toastManager.show({ type: "success", title, message }),
  error: (message: string, title = "Error") =>
    toastManager.show({ type: "error", title, message }),
  info: (message: string, title = "Information") =>
    toastManager.show({ type: "info", title, message }),
  warning: (message: string, title = "Notice") =>
    toastManager.show({ type: "warning", title, message }),
  dismiss: (id: string) => toastManager.dismiss(id),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;
      case "error":
        return <AlertCircle size={18} className="text-[#FF4D3D] shrink-0" />;
      case "warning":
        return <AlertTriangle size={18} className="text-amber-400 shrink-0" />;
      case "info":
      default:
        return <Info size={18} className="text-sky-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.15)]";
      case "error":
        return "border-[#FF4D3D]/40 shadow-[0_10px_30px_rgba(255,77,61,0.25)]";
      case "warning":
        return "border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,0.15)]";
      case "info":
      default:
        return "border-sky-500/30 shadow-[0_10px_30px_rgba(56,189,248,0.15)]";
    }
  };

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none print:hidden"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.type === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#111111]/95 p-3.5 text-white backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${getBorderColor(
            item.type
          )}`}
        >
          <div className="pt-0.5">{getIcon(item.type)}</div>
          <div className="flex-1 space-y-0.5">
            <h4 className="text-xs font-bold tracking-tight text-[#F5F5F5]">{item.title}</h4>
            {item.message && (
              <p className="text-[11px] leading-relaxed text-[#A0A0A0]">{item.message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => toastManager.dismiss(item.id)}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 text-[#666666] hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
