"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { validateEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    const val = validateEmail(email);
    if (!val.isValid) {
      setEmailError(val.error || "Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    await forgotPassword(email);
    setIsSubmitting(false);
    // Always show generic success state to prevent account enumeration
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-[68vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="account-card w-full max-w-md space-y-6 rounded-xl border border-line bg-white p-6 sm:p-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Reset your password
          </h1>
          <p className="mt-1 text-xs text-muted">
            Enter your account email to receive secure recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 py-4 text-center animate-in fade-in">
            <div className="mx-auto grid size-14 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="text-lg font-semibold text-ink">Instructions Dispatched</h2>
            <p className="text-xs text-muted leading-relaxed">
              If an account is associated with <strong className="text-ink">{email}</strong>, we have
              sent a single-use password reset link. Please check your inbox and spam folder.
            </p>
            <p className="text-[11px] text-[#666666]">
              The link expires in 30 minutes for security purposes.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink hover:bg-paper transition"
              >
                <ArrowLeft size={14} />
                <span>Return to Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink mb-1">
                Account email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "email-error" : undefined}
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="alex@company.com"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:outline-none transition ${
                    emailError
                      ? "border-red-500 focus:border-red-500"
                      : "border-line focus:border-moss/80"
                  }`}
                />
              </div>
              {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-red-800">{emailError}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-moss py-3 text-sm font-semibold text-white transition hover:bg-moss active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs text-muted hover:text-ink transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={13} />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
