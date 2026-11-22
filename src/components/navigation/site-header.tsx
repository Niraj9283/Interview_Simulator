"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Wordmark } from "./wordmark";

export function SiteHeader({ onSearch }: { onSearch: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);

  function openHelp() {
    setExpanded(false);
    window.dispatchEvent(new CustomEvent("mockmate:open-faq"));
  }

  return (
    <header className="site-header print:hidden" onKeyDown={(event) => {
      if (event.key === "Escape") {
        setExpanded(false);
        document.getElementById("site-menu-toggle")?.focus();
      }
    }}>
      <div className="page-width site-nav">
        <Wordmark />
        <nav aria-label="Main navigation" className="desktop-nav">
          <Link href="/#practice-modes" onClick={(event) => {
            if (!document.getElementById("practice-modes")) {
              event.preventDefault();
              window.dispatchEvent(new CustomEvent("mockmate:open-module", { detail: { moduleId: "behavioral-star-rubric" } }));
            }
          }}>Practice modes</Link>
          <button type="button" onClick={openHelp}>Help center</button>
        </nav>
        <div className="nav-actions">
          <button type="button" className="nav-search" aria-label="Search site" onClick={onSearch}><Search size={18} /></button>
          {isAuthenticated && user ? (
            <Link href="/settings/security" className="nav-account">{user.name || "Account"}</Link>
          ) : (
            <>
              <Link href="/login" className="nav-login">Sign in</Link>
              <Link href="/register" className="nav-account">Create account <ArrowUpRight size={15} /></Link>
            </>
          )}
          <button type="button" id="site-menu-toggle" className={isAuthenticated ? "menu-toggle signed-in" : "menu-toggle"} aria-label={expanded ? "Close navigation" : "Open navigation"} aria-expanded={expanded} aria-controls="site-mobile-menu" onClick={() => setExpanded(!expanded)}>
            {expanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {expanded && (
        <nav id="site-mobile-menu" className="mobile-nav" aria-label="More navigation">
          <button type="button" onClick={() => {
            setExpanded(false);
            const modes = document.getElementById("practice-modes");
            if (modes) modes.scrollIntoView();
            else window.dispatchEvent(new CustomEvent("mockmate:open-module", {detail: {moduleId: "behavioral-star-rubric"}}));
          }}>Practice modes</button>
          <button type="button" onClick={openHelp}>Help center</button>
          <button type="button" onClick={() => { setExpanded(false); onSearch(); }}>Search the site</button>
          {isAuthenticated ? <>
            <Link href="/onboarding" onClick={() => setExpanded(false)}>Profile setup</Link>
            <button type="button" onClick={() => { setExpanded(false); void logout(); }}>Sign out</button>
          </> : <Link href="/login" onClick={() => setExpanded(false)}>Sign in</Link>}
        </nav>
      )}
    </header>
  );
}
