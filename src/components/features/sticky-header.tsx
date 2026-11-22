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
      setIsScrolled(window.scrollY > 15);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top - 0 z - 40 transition - all duration - 200 ${
  isScrolled
    ? "border-b border-zinc-800/80 bg-zinc-950/90 py-2.5 backdrop-blur-xl shadow-xs"
    : "border-b border-zinc-800/50 bg-zinc-950/60 py-3 backdrop-blur-md"
} `}
    >
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 lg:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition active:scale-98"
            aria-label="MockMate AI Home"
          >
            <div className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-950 font-semibold shadow-xs">
              <BrainCircuit size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-zinc-100">
                  MockMate<span className="text-zinc-400">.ai</span>
                </span>
                <span className="hidden sm:inline-flex rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                  v2.0
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center / Navigation Links for desktop */}
        <nav className="hidden md:flex items-center gap-1 rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-1">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="rounded-md px-3 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            Simulator
          </button>
          <Link
            href="/onboarding"
            className="rounded-md px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            Setup Guide
          </Link>
          <button
            type="button"
            onClick={onOpenFeedback}
            className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            <HelpCircle size={13} className="text-zinc-400" />
            FAQ & Help
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <LastUpdatedBadge timestamp={lastUpdated} className="hidden md:inline-flex" />

          {/* Search Trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex h-8 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 cursor-pointer"
            aria-label="Search site (Cmd+K)"
            title="Search site (Cmd+K)"
          >
            <Search size={13} className="text-zinc-500" />
            <span className="hidden sm:inline text-xs">Search...</span>
            <kbd className="hidden sm:inline-block rounded border border-zinc-800 bg-zinc-950 px-1 py-0.2 text-[10px] font-mono text-zinc-500">
              ⌘K
            </kbd>
          </button>

          {/* Auth State */}
          <div className="hidden sm:flex items-center gap-1.5">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/settings/security"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition"
                  title="Security and Account Settings"
                >
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition cursor-pointer"
                  title="Log Out"
                  aria-label="Log out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:text-white transition"
                >
                  <LogIn size={13} className="text-zinc-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-950 hover:bg-white transition shadow-xs"
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
