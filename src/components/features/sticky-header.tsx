"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, Search, HelpCircle, LogIn, LogOut } from "lucide-react";
import { DarkModeToggle } from "./dark-mode-toggle";
import { MobileMenu } from "./mobile-menu";
import { LastUpdatedBadge } from "./last-updated-badge";
import { useAuth } from "@/lib/auth-context";

interface StickyHeaderProps {
  onOpenSearch: () => void;
  onOpenFeedback: () => void;
  lastUpdated?: number | Date | string;
  children?: React.ReactNode;
}

export function StickyHeader({
  onOpenSearch,
  onOpenFeedback,
  lastUpdated,
  children,
}: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 print:hidden ${
        isScrolled
          ? "border-b border-[#222222] bg-[#080808]/95 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          : "border-b border-[#1b1b1b] bg-[#080808]/75 py-3.5 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 lg:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="group flex items-center gap-2.5 transition-transform active:scale-95"
            aria-label="MockMate AI Home"
          >
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#D9362B] to-[#FF4D3D] text-white shadow-md shadow-[#FF4D3D]/25 group-hover:shadow-[0_0_20px_rgba(255,77,61,0.5)] transition-shadow">
              <BrainCircuit size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[#F5F5F5]">MockMate<span className="text-[#FF4D3D]">.AI</span></span>
                <span className="hidden sm:inline-flex rounded-full bg-[#FF4D3D]/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#FF4D3D] border border-[#FF4D3D]/30">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-[#A0A0A0] hidden sm:block font-mono tracking-tight">
                Autonomous Interview & Evaluation Architecture
              </p>
            </div>
          </a>
        </div>

        {/* Center / Navigation Links for desktop */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl border border-[#222222] bg-[#111111]/80 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#F5F5F5] hover:bg-white/5 transition cursor-pointer"
          >
            Simulator
          </button>
          <Link
            href="/onboarding"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5 transition"
          >
            Setup Guide
          </Link>
          <button
            type="button"
            onClick={onOpenFeedback}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5 transition cursor-pointer"
          >
            <HelpCircle size={13} className="text-[#FF4D3D]" />
            FAQ & Help
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          <LastUpdatedBadge timestamp={lastUpdated} className="hidden md:inline-flex" />

          {/* Search Trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-9 items-center gap-2.5 rounded-xl border border-[#262626] bg-[#151515] px-3 text-xs font-medium text-[#A0A0A0] shadow-sm transition hover:border-[#FF4D3D]/50 hover:bg-[#1a1a1a] hover:text-[#F5F5F5] active:scale-95 cursor-pointer"
            aria-label="Search site (Cmd+K)"
            title="Search site (Cmd+K)"
          >
            <Search size={14} className="text-[#FF4D3D]" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block rounded border border-[#333333] bg-[#0c0c0c] px-1.5 py-0.5 text-[10px] font-mono text-[#A0A0A0]">
              ⌘K
            </kbd>
          </button>

          {/* Auth State */}
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/settings/security"
                  className="flex items-center gap-1.5 rounded-xl border border-[#262626] bg-[#151515] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:border-[#FF4D3D]/40 transition"
                  title="Security and Account Settings"
                >
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex size-9 items-center justify-center rounded-xl border border-[#262626] bg-[#151515] text-[#A0A0A0] hover:text-[#FF4D3D] hover:border-[#FF4D3D]/40 transition cursor-pointer"
                  title="Log Out"
                  aria-label="Log out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-xl border border-[#262626] bg-[#151515] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:border-[#FF4D3D]/40 transition"
                >
                  <LogIn size={13} className="text-[#FF4D3D]" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center rounded-xl bg-gradient-to-r from-[#D9362B] to-[#FF4D3D] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#FF4D3D]/20 hover:brightness-110 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Children passed in (e.g. edge mode or custom toggles) */}
          {children}

          {/* Dark Mode Toggle */}
          <div className="hidden sm:block">
            <DarkModeToggle showLabel={false} />
          </div>

          {/* Mobile Menu */}
          <MobileMenu onOpenSearch={onOpenSearch} onOpenFeedback={onOpenFeedback} />
        </div>
      </div>
    </header>
  );
}
