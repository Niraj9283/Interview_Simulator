"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrainCircuit, Mail, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { validateEmail } from "@/lib/validation";
import { PasswordVisibilityToggle } from "@/components/features/password-visibility-toggle";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect home
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    // Field-level validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || "Invalid email");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password, rememberMe);
    setIsSubmitting(false);

    if (result.success) {
      router.push("/");
    } else {
      setGeneralError(result.error || "Invalid email or password.");
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,77,61,0.08)]">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#D9362B] to-[#FF4D3D] text-white shadow-md shadow-[#FF4D3D]/30 transition group-hover:scale-105">
              <BrainCircuit size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#F5F5F5]">
              MockMate<span className="text-[#FF4D3D]">.AI</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Sign in to your account
          </h1>
          <p className="mt-2 text-xs text-[#A0A0A0]">
            Autonomous speech analytics and AI interview simulation
          </p>
        </div>

        {/* Global Error Alert */}
        {generalError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-200 animate-in fade-in"
          >
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Sign in failed</p>
              <p className="mt-0.5 text-neutral-300">{generalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#D4D4D4] mb-1.5">
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                <Mail size={16} />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                placeholder="you@company.com"
                className={`w-full rounded-xl border bg-[#181818] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none transition ${
                  emailError
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#2A2A2A] focus:border-[#FF4D3D]/80"
                }`}
              />
            </div>
            {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-[#D4D4D4]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#FF4D3D] hover:text-[#ff6a5c] transition font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                <Lock size={16} />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-[#181818] py-2.5 pl-10 pr-10 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none transition ${
                  passwordError
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#2A2A2A] focus:border-[#FF4D3D]/80"
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <PasswordVisibilityToggle
                  isVisible={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                />
              </div>
            </div>
            {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-[#333333] bg-[#1a1a1a] text-[#FF4D3D] focus:ring-[#FF4D3D]/50 focus:ring-offset-0"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs text-[#A0A0A0] cursor-pointer">
              Remember me on this trusted device
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 transition hover:bg-[#ff3826] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-4 text-center border-t border-[#222222] text-xs text-[#A0A0A0]">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-semibold text-[#FF4D3D] hover:underline">
            Register for free
          </Link>
        </div>
      </div>
    </div>
  );
}
