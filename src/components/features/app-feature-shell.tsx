"use client";

import React, { useEffect, useState } from "react";
import { ThemeProvider } from "./theme-provider";
import { SkipToContent } from "./skip-to-content";
import { ScrollProgressBar } from "./scroll-progress-bar";
import { CookieBanner } from "./cookie-banner";
import { BackToTop } from "./back-to-top";
import { FloatingContactButton } from "./floating-contact-button";
import { SiteSearchModal } from "./site-search-modal";
import { captureUTM } from "@/lib/utm-tracker";

export function AppFeatureShell({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  useEffect(() => {
    // Feature #14: Capture UTM parameters on initial load
    captureUTM();

    // Global keyboard shortcut for Site Search (Cmd+K / Ctrl+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ThemeProvider>
      {/* Feature #12: Skip to main content (a11y) */}
      <SkipToContent targetId="main-content" />

      {/* Feature #8: Scroll progress bar */}
      <ScrollProgressBar />

      {/* Main app content */}
      <div id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </div>

      {/* Feature #4: Back to top button */}
      <BackToTop />

      {/* Feature #20: Floating contact / feedback button */}
      <FloatingContactButton
        isOpenExternal={isContactOpen}
        onCloseExternal={() => setIsContactOpen(false)}
        onToggleExternal={(open) => setIsContactOpen(open)}
      />

      {/* Feature #2: Privacy & Cookie banner */}
      <CookieBanner />

      {/* Feature #3: Site search command palette */}
      <SiteSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenEdgeTopology={() => {
          const btn = document.querySelector<HTMLButtonElement>('[title*="Edge AI"]');
          btn?.click();
        }}
        onOpenIntegrity={() => {
          const btn = document.querySelector<HTMLButtonElement>('[title*="Integrity"]');
          btn?.click();
        }}
        onOpenBenchmark={() => {
          const btn = document.querySelector<HTMLButtonElement>('[title*="Benchmark"]');
          btn?.click();
        }}
      />
    </ThemeProvider>
  );
}
