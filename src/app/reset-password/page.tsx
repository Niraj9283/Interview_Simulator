"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { evaluatePasswordStrength, validatePasswordMatch } from "@/lib/validation";
import { PasswordVisibilityToggle } from "@/components/features/password-visibility-toggle";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const passwordStrength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setConfirmError("");
    setGeneralError("");

    if (!token) {
      setGeneralError("Reset token is missing from the URL. Please check your reset link.");
      return;
    }

    if (!passwordStrength.isValid) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    const matchVal = validatePasswordMatch(password, confirmPassword);
    if (!matchVal.isValid) {
      setConfirmError(matchVal.error || "Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(token, password);
    setIsSubmitting(false);

    if (result.success) {
      setResetSuccess(true);
    } else {
      setGeneralError(result.error || "Password reset token is invalid or has expired.");
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#222222] bg-[#121212]/95 p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertCircle size={30} />
          </div>
          <h1 className="text-xl font-bold text-white">Missing Reset Token</h1>
          <p className="text-xs text-[#A0A0A0]">
            The password reset link is invalid or incomplete. Please request a fresh reset link.
          </p>
          <div className="pt-2">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-[#ff3826] transition"
            >
              Request Password Reset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,77,61,0.08)]">
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Set new password
          </h1>
          <p className="mt-1 text-xs text-[#A0A0A0]">
            Choose a strong, unique password to secure your interview preparation account.
          </p>
        </div>

        {resetSuccess ? (
          <div className="space-y-4 py-4 text-center animate-in fade-in">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="text-xl font-bold text-white">Password Updated!</h2>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Your password has been changed successfully and previous active sessions have been
              revoked.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 transition hover:bg-[#ff3826]"
              >
                <span>Sign in with new password</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {generalError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-200"
              >
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <p>{generalError}</p>
              </div>
            )}

            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#D4D4D4] mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="At least 8 characters"
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

              {password && (
                <div className="mt-2 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#888888]">Strength:</span>
                    <span className="font-semibold" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#222222] overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                </div>
              )}
              {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#D4D4D4] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                  <Lock size={16} />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError("");
                  }}
                  placeholder="Repeat new password"
                  className={`w-full rounded-xl border bg-[#181818] py-2.5 pl-10 pr-10 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none transition ${
                    confirmError
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#2A2A2A] focus:border-[#FF4D3D]/80"
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <PasswordVisibilityToggle
                    isVisible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((prev) => !prev)}
                  />
                </div>
              </div>
              {confirmError && <p className="mt-1 text-xs text-red-400">{confirmError}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 transition hover:bg-[#ff3826] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[85vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#FF4D3D]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
