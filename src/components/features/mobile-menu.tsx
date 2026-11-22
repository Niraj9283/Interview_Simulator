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
        className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
      >
        <Menu size={16} />
      </button>

      {/* Slide-over Drawer & Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer content */}
            <div className="relative flex h-full w-4/5 max-w-sm flex-col border-l border-zinc-800 bg-zinc-950 p-6 text-zinc-200 shadow-xl animate-in slide-in-from-right duration-200">
              {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                  <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-950 font-semibold shadow-xs">
                        <BrainCircuit size={17} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">MockMate<span className="text-zinc-400">.ai</span></div>
                        <div className="text-[10px] text-zinc-500 font-mono">Platform Navigation</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                      aria-label="Close mobile menu"
                    >
                      <X size={17} />
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
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-left text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                    >
                      <span className="flex items-center gap-2">
                        <Search size={14} className="text-zinc-500" />
                        Search platform...
                      </span>
                        <kbd className="rounded border border-zinc-800 bg-zinc-950 px-1 py-0.2 text-[9px] font-mono text-zinc-500">
                          ⌘K
                        </kbd>
                    </button>
                  </div>

                  {/* Navigation links */}
                      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
                        <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 px-2 py-1">
                          Sections
                        </div>
                        {navLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <button
                              key={link.label}
                              type="button"
                              onClick={link.action}
                              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 cursor-pointer"
                            >
                              <Icon size={15} className="text-zinc-400 shrink-0" />
                              <span>{link.label}</span>
                            </button>
                          );
                        })}
                        {/* Account Section */}
                            <div className="mt-4 border-t border-zinc-850 pt-4">
                              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 px-2 py-1">
                                Account & Settings
                              </div>
                              {isAuthenticated && user ? (
                                <div className="flex flex-col gap-1.5 mt-1">
                                      <div className="flex items-center gap-2.5 rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800">
                                        <div className="size-7 rounded-full bg-zinc-800 text-zinc-200 grid place-items-center font-semibold text-xs shrink-0">
                                          {user.name ? user.name[0].toUpperCase() : "U"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-xs font-medium text-zinc-100 truncate">{user.name || "Candidate"}</div>
                                          <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
                                        </div>
                                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${user.email_verified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                            {user.email_verified ? "Verified" : "Unverified"}
                                          </span>
                                      </div>
                                      <Link
                                        href="/onboarding"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition"
                                      >
                                        <Compass size={15} className="text-zinc-400" />
                                        <span>Onboarding Guide</span>
                                      </Link>
                                      <Link
                                        href="/settings/security"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition"
                                      >
                                        <ShieldCheck size={15} className="text-zinc-400" />
                                        <span>Security Settings</span>
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsOpen(false);
                                          logout();
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                      >
                                        <LogOut size={15} />
                                        <span>Sign Out</span>
                                      </button>
                                    </div>
                                    ) : (
                                    <div className="flex flex-col gap-2 mt-2">
                                      <Link
                                        href="/login"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition"
                                      >
                                        <LogIn size={13} className="text-zinc-400" />
                                        <span>Sign In</span>
                                      </Link>
                                      <Link
                                        href="/register"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-950 hover:bg-white transition shadow-xs"
                                      >
                                        Create Free Account
                                      </Link>
                                    </div>
                )}
                                  </div>
                                </nav>

            {/* Footer with Dark mode toggle & version */}
                                <div className="border-t border-zinc-850 pt-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400 font-medium">Appearance</span>
                                    <DarkModeToggle />
                                  </div>
                                    <div className="mt-3 text-center text-[10px] text-zinc-500 font-mono">
                                      MockMate AI • Professional Technical Simulation
                                    </div>
                                  </div>
                                </div>
                              </div>
      )}
                            </div>
                            );
}
