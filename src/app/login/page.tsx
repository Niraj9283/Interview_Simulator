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
    <div className="flex min-h-[72vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-950 font-semibold shadow-xs">
              <BrainCircuit size={18} />
            </div>
            <span className="text-sm font-semibold text-zinc-100">
              MockMate<span className="text-zinc-400">.ai</span>
            </span>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Sign in to your account
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Access your practice history, speech telemetry, and roadmap.
          </p>
        </div>

        {/* Global Error Alert */}
        {generalError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 animate-in fade-in"
          >
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-300">Sign in failed</p>
              <p className="mt-0.5 text-zinc-300">{generalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Mail size={15} />
              </div>
              <input
                id="email"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
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
              className={`w-full rounded-lg border bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition ${emailError
                  ? "border-rose-500 focus:border-rose-500"
                  : "border-zinc-800 focus:border-zinc-600"
                }`}
              />
            </div>
            {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-rose-400">{emailError}</p>}
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Lock size={15} />
              </div>
              <input
                id="password"
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "password-error" : undefined}
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
                className={`w-full rounded-lg border bg-zinc-950 py-2 pl-9 pr-9 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition ${passwordError
                  ? "border-rose-500 focus:border-rose-500"
                  : "border-zinc-800 focus:border-zinc-600"
                  }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <PasswordVisibilityToggle
                  isVisible={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                />
              </div>
            </div>
            {passwordError && <p id="password-error" role="alert" className="mt-1 text-xs text-rose-400">{passwordError}</p>}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-3.5 rounded border-zinc-800 bg-zinc-950 text-blue-500"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs text-zinc-400 cursor-pointer">
              Remember me on this trusted device
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-white active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* Quick Demo Login Option */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative bg-zinc-900 px-2 text-[10px] font-mono uppercase text-zinc-500">
              Demo access
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              setGeneralError("");
              const result = await login("candidate@mockmate.ai", "DemoPassword123!", true);
              setIsSubmitting(false);
              if (result.success) {
                router.push("/");
              } else {
                setGeneralError(result.error || "Unable to initialize demo session.");
              }
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
          >
            <BrainCircuit size={14} className="text-zinc-400" />
            <span>Instant Demo Candidate Access</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="pt-3 text-center border-t border-zinc-800 text-xs text-zinc-400">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-medium text-zinc-200 hover:underline">
            Register for free
          </Link>
        </div>
      </div>
    </div>
  );
}
