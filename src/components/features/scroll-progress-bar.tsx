"use client";

import React, { useEffect, useRef } from "react";

export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const updateProgress = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100)) : 0;
      if (barRef.current) {
        barRef.current.style.width = `${progress}%`;
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-black/20 pointer-events-none print:hidden"
      role="progressbar"
      aria-label="Page reading and scroll progress"
    >
      <div
        ref={barRef}
        className="h-full bg-gradient-to-r from-[#D9362B] to-[#FF4D3D] shadow-[0_0_10px_rgba(255,77,61,0.8)] will-change-[width]"
        style={{ width: "0%" }}
      />
    </div>
  );
}
