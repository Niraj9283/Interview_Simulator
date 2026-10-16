"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
}

export function CopyButton({
  text,
  label,
  copiedLabel = "Copied!",
  className = "",
  size = "md",
  variant = "outline",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy text:", err);
    }
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-[11px] gap-1",
    md: "px-3 py-1.5 text-xs gap-1.5",
    lg: "px-4 py-2 text-sm gap-2",
  };

  const variantClasses = {
    ghost: "bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white",
    outline: "border border-fuchsia-400/25 bg-[#241044]/60 text-fuchsia-200 hover:border-fuchsia-300 hover:bg-[#34185d] hover:text-white shadow-sm",
    solid: "bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-md shadow-fuchsia-900/40",
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label || "Copy to clipboard"}
      title={copied ? copiedLabel : label || "Copy to clipboard"}
      className={`group relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 active:scale-95 cursor-pointer ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        copied ? "!border-emerald-500/60 !bg-emerald-950/60 !text-emerald-300" : ""
      } ${className}`}
    >
      {copied ? (
        <>
          <Check size={size === "sm" ? 12 : 14} className="text-emerald-400 animate-in zoom-in-50 duration-200" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy size={size === "sm" ? 12 : 14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
