"use client";

import React, { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface PasswordVisibilityToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: boolean;
}

export function PasswordVisibilityInput({
  label,
  error,
  icon = true,
  className = "",
  id,
  ...props
}: PasswordVisibilityToggleProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-fuchsia-400/60 pointer-events-none">
            <KeyRound size={16} />
          </div>
        )}
        <input
          {...props}
          id={inputId}
          type={showPassword ? "text" : "password"}
          className={`w-full rounded-xl border border-fuchsia-400/25 bg-[#190a2e]/90 py-2.5 text-sm text-white placeholder:text-zinc-500 backdrop-blur transition-all focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400 ${
            icon ? "pl-9" : "pl-3.5"
          } pr-10 ${error ? "!border-rose-500/70 !ring-rose-500/30" : ""} ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 grid size-7 place-items-center rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
          aria-label={showPassword ? "Hide password or token" : "Show password or token"}
          title={showPassword ? "Hide password or token" : "Show password or token"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}
    </div>
  );
}
