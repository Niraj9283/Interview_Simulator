"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

interface DarkModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function DarkModeToggle({ className = "", showLabel = true }: DarkModeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex h-10 items-center gap-2 rounded-lg border border-fuchsia-400/25 bg-[#241044]/86 px-3 py-2 text-white shadow-[0_0_20px_rgba(236,72,153,0.15)] backdrop-blur transition-all duration-200 hover:border-fuchsia-300/60 hover:shadow-[0_0_25px_rgba(236,72,153,0.3)] active:scale-95 cursor-pointer ${className}`}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
    >
      <div className="relative flex items-center justify-center">
        <Sun
          size={16}
          className={`transition-all duration-300 ${
            isDark ? "scale-0 rotate-90 text-amber-300 opacity-0 absolute" : "scale-100 rotate-0 text-amber-400 opacity-100"
          }`}
        />
        <Moon
          size={16}
          className={`transition-all duration-300 ${
            isDark ? "scale-100 rotate-0 text-fuchsia-300 opacity-100" : "scale-0 -rotate-90 text-fuchsia-200 opacity-0 absolute"
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tracking-wide">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
