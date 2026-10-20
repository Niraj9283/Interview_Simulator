"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  LogIn,
  LogOut,
  Compass,
} from "lucide-react";
import { DarkModeToggle } from "./dark-mode-toggle";
import { useAuth } from "@/lib/auth-context";

interface MobileMenuProps {
  onOpenSearch: () => void;
  onOpenFeedback: () => void;
}

export function MobileMenu({ onOpenSearch, onOpenFeedback }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

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
              {/* Account Section */}
              <div className="mt-4 border-t border-[#222222] pt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] px-2 py-1">
                  Account & Profile
                </div>
                {isAuthenticated && user ? (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center gap-2.5 rounded-lg bg-[#161616] p-2.5 border border-[#222222]">
                      <div className="size-8 rounded-full bg-[#FF4D3D]/15 text-[#FF4D3D] grid place-items-center font-bold text-xs shrink-0">
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{user.name || "Candidate"}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{user.email}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${user.email_verified ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {user.email_verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <Link
                      href="/onboarding"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#A0A0A0] hover:bg-white/5 hover:text-[#F5F5F5] transition"
                    >
                      <Compass size={16} className="text-[#FF4D3D]" />
                      <span>Onboarding Setup</span>
                    </Link>
                    <Link
                      href="/settings/security"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#A0A0A0] hover:bg-white/5 hover:text-[#F5F5F5] transition"
                    >
                      <ShieldCheck size={16} className="text-[#FF4D3D]" />
                      <span>Security & Delete Account</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-[#262626] bg-[#151515] py-2.5 text-xs font-semibold text-white hover:border-[#FF4D3D]/50 transition"
                    >
                      <LogIn size={14} className="text-[#FF4D3D]" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center rounded-xl bg-gradient-to-r from-[#D9362B] to-[#FF4D3D] py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF4D3D]/20 transition"
                    >
                      Create Free Account
                    </Link>
                  </div>
                )}
              </div>
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
