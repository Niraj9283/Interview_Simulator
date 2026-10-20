"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { validateEmail } from "@/lib/validation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail, resendVerification } = useAuth();

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    if (token) {
      verifyEmail(token).then((res) => {
        if (res.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage(res.error || "Verification token is invalid or has expired.");
        }
      });
    }
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendError("");

    const val = validateEmail(resendEmail);
    if (!val.isValid) {
      setResendError(val.error || "Please enter a valid email address.");
      return;
    }

    setIsResending(true);
    const res = await resendVerification(resendEmail);
    setIsResending(false);

    if (res.success) {
      setResendSuccess(true);
    } else {
      setResendError(res.message || "Failed to resend verification link.");
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#222222] bg-[#121212]/95 p-8 text-center backdrop-blur-xl shadow-2xl">
        {/* Brand */}
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#D9362B] to-[#FF4D3D] text-white shadow-md shadow-[#FF4D3D]/30 transition group-hover:scale-105">
            <BrainCircuit size={22} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#F5F5F5]">
            MockMate<span className="text-[#FF4D3D]">.AI</span>
          </span>
        </Link>

        {/* State: Verifying */}
        {status === "verifying" && (
          <div className="space-y-4 py-6">
            <Loader2 size={40} className="mx-auto text-[#FF4D3D] animate-spin" />
            <h1 className="text-xl font-bold text-white">Verifying your email...</h1>
            <p className="text-xs text-[#888888]">
              Confirming your cryptographic token with the security server.
            </p>
          </div>
        )}

        {/* State: Success */}
        {status === "success" && (
          <div className="space-y-4 py-4 animate-in fade-in">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-2xl font-bold text-white">Email Verified!</h1>
            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Your email address has been successfully confirmed. You now have full access to
              autonomous interview simulations, speech cadence analytics, and system design sandboxes.
            </p>
            <div className="pt-4">
              <Link
                href="/onboarding"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF4D3D] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/25 transition hover:bg-[#ff3826]"
              >
                <span>Complete Onboarding</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* State: Error or Idle (Resend verification) */}
        {(status === "error" || status === "idle") && (
          <div className="space-y-5 animate-in fade-in">
            {status === "error" ? (
              <>
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
                  <XCircle size={36} />
                </div>
                <h1 className="text-xl font-bold text-white">Verification Link Expired</h1>
                <p className="text-xs text-red-300 bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl">
                  {errorMessage || "This link is invalid or has already been used."}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#1c1c1c] border border-[#2c2c2c] text-[#FF4D3D]">
                  <Mail size={32} />
                </div>
                <h1 className="text-xl font-bold text-white">Verify Your Email</h1>
                <p className="text-xs text-[#A0A0A0]">
                  Need a new verification link? Enter your email address below to receive one.
                </p>
              </>
            )}

            {resendSuccess ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-200">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-400" />
                <p className="font-semibold text-emerald-300">Verification email dispatched!</p>
                <p className="mt-1 text-neutral-300">
                  If an account matches <strong className="text-white">{resendEmail}</strong>, check
                  your inbox for a fresh link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 text-left" noValidate>
                <div>
                  <label htmlFor="resend-email" className="block text-xs font-medium text-[#D4D4D4] mb-1">
                    Your account email
                  </label>
                  <input
                    id="resend-email"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => {
                      setResendEmail(e.target.value);
                      if (resendError) setResendError("");
                    }}
                    placeholder="alex@company.com"
                    className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder:text-[#555555] focus:border-[#FF4D3D]/80 focus:outline-none transition"
                  />
                  {resendError && <p className="mt-1 text-xs text-red-400">{resendError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#161616] py-2.5 text-xs font-bold text-white hover:bg-[#202020] transition cursor-pointer disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Verification Link</span>
                  )}
                </button>
              </form>
            )}

            <div className="pt-2 text-center text-xs text-[#888888]">
              <Link href="/login" className="hover:text-white transition">
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[85vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#FF4D3D]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
