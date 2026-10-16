"use client";

import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  BrainCircuit,
  Search,
  Code2,
  Monitor,
  ShieldCheck,
  HelpCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { DarkModeToggle } from "./dark-mode-toggle";

interface MobileMenuProps {
  onOpenSearch: () => void;
  onOpenFeedback: () => void;
}

export function MobileMenu({ onOpenSearch, onOpenFeedback }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navLinks = [
    {
      label: "Practice Interview",
      icon: BrainCircuit,
      action: () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setIsOpen(false);
      },
    },
    {
      label: "Coding Sandbox",
      icon: Code2,
      action: () => {
        const el = document.getElementById("coding-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
        setIsOpen(false);
      },
    },
    {
      label: "System Design Canvas",
      icon: Monitor,
      action: () => {
        const el = document.getElementById("system-design-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
        setIsOpen(false);
      },
    },
    {
      label: "Frequently Asked Questions",
      icon: HelpCircle,
      action: () => {
        setIsOpen(false);
        onOpenFeedback();
      },
    },
    {
      label: "Send Feedback / Support",
      icon: MessageSquare,
      action: () => {
        setIsOpen(false);
        onOpenFeedback();
      },
    },
  ];

  return (
    <div className="lg:hidden print:hidden">
      {/* Mobile Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open mobile menu"
        className="flex size-9 items-center justify-center rounded-xl border border-[#262626] bg-[#151515] text-[#F5F5F5] shadow-sm transition hover:border-[#FF4D3D]/50 hover:bg-[#1a1a1a] active:scale-95 cursor-pointer"
      >
        <Menu size={18} />
      </button>

      {/* Slide-over Drawer & Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex h-full w-4/5 max-w-sm flex-col border-l border-[#262626] bg-[#111111] p-6 text-white shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222222] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#D9362B] to-[#FF4D3D] text-white shadow-md shadow-[#FF4D3D]/25">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <div className="text-base font-bold leading-tight text-[#F5F5F5]">MockMate<span className="text-[#FF4D3D]">.AI</span></div>
                  <div className="text-[10px] text-[#A0A0A0] font-mono">System Navigation</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-[#A0A0A0] hover:bg-white/10 hover:text-white"
                aria-label="Close mobile menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick search button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSearch();
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[#262626] bg-[#151515] px-3.5 py-2.5 text-left text-xs font-medium text-[#A0A0A0] transition hover:border-[#FF4D3D]/40 hover:text-[#F5F5F5]"
              >
                <span className="flex items-center gap-2">
                  <Search size={15} className="text-[#FF4D3D]" />
                  Search topics or features...
                </span>
                <kbd className="rounded border border-[#333333] bg-[#0c0c0c] px-1 py-0.5 text-[9px] font-mono text-[#A0A0A0]">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Navigation links */}
            <nav className="mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] px-2 py-1">
                Navigation
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={link.action}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#A0A0A0] transition hover:bg-white/5 hover:text-[#F5F5F5] cursor-pointer"
                  >
                    <Icon size={18} className="text-[#FF4D3D] shrink-0" />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer with Dark mode toggle & version */}
            <div className="border-t border-[#222222] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A0A0A0] font-medium">Appearance</span>
                <DarkModeToggle />
              </div>
              <div className="mt-4 text-center text-[10px] text-[#666666] font-mono">
                MockMate AI • Dark Red-Orange Technical Edition
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
