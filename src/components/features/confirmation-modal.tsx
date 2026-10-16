"use client";

import React, { useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      border: "border-[#FF4D3D]/50",
      iconBg: "bg-[#FF4D3D]/15",
      iconColor: "text-[#FF4D3D]",
      confirmBtn: "bg-gradient-to-r from-[#D9362B] to-[#FF4D3D] hover:brightness-110 text-white shadow-md shadow-[#FF4D3D]/25",
      icon: AlertTriangle,
    },
    warning: {
      border: "border-amber-500/40",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
      confirmBtn: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40",
      icon: AlertCircle,
    },
    info: {
      border: "border-[#FF4D3D]/40",
      iconBg: "bg-[#FF4D3D]/15",
      iconColor: "text-[#FF4D3D]",
      confirmBtn: "bg-[#FF4D3D] hover:bg-[#ff6557] text-white shadow-[#FF4D3D]/30",
      icon: Info,
    },
  }[variant];

  const Icon = variantStyles.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border ${variantStyles.border} bg-[#151515] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(255,77,61,0.12)] backdrop-blur-2xl animate-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start gap-4">
          <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${variantStyles.iconBg} ${variantStyles.iconColor} shadow-inner`}>
            <Icon size={24} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-[#F5F5F5]">
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="text-xs leading-relaxed text-[#A0A0A0]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-[#A0A0A0] hover:bg-white/10 hover:text-white transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#262626] pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-xs font-semibold text-[#A0A0A0] transition hover:bg-white/5 hover:text-white cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer ${variantStyles.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
