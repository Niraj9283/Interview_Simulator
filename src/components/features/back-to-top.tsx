"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top of page"
      className="fixed bottom-6 right-24 z-40 flex size-11 items-center justify-center rounded-xl border border-divider bg-console/95 text-neutral-300  backdrop-blur transition-all duration-300 hover:border-signal hover:bg-console hover:text-signal  active:scale-95 animate-in fade-in slide-in-from-bottom-4 cursor-pointer print:hidden"
      title="Scroll back to top"
    >
      <ArrowUp size={18} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}
