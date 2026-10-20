"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrainCircuit, Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
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
            Reset your password
          </h1>
          <p className="mt-1 text-xs text-[#A0A0A0]">
            Enter your account email to receive secure recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 py-4 text-center animate-in fade-in">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="text-lg font-bold text-white">Instructions Dispatched</h2>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              If an account is associated with <strong className="text-white">{email}</strong>, we have
              sent a single-use password reset link. Please check your inbox and spam folder.
            </p>
            <p className="text-[11px] text-[#666666]">
              The link expires in 30 minutes for security purposes.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#161616] py-2.5 text-xs font-bold text-white hover:bg-[#202020] transition"
              >
                <ArrowLeft size={14} />
                <span>Return to Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#D4D4D4] mb-1">
                Account email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="alex@company.com"
                  className={`w-full rounded-xl border bg-[#181818] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none transition ${
                    emailError
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#2A2A2A] focus:border-[#FF4D3D]/80"
                  }`}
                />
              </div>
              {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 transition hover:bg-[#ff3826] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
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
                className="text-xs text-[#888888] hover:text-white transition inline-flex items-center gap-1.5"
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
