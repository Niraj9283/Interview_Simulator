"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
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
    <div className="flex min-h-[68vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="account-card w-full max-w-md space-y-6 rounded-xl border border-line bg-white p-8 text-center shadow-sm">
        {/* Brand */}

        {/* State: Verifying */}
        {status === "verifying" && (
          <div className="space-y-4 py-6">
            <Loader2 size={40} className="mx-auto text-moss animate-spin" />
            <h1 className="text-xl font-semibold text-ink">Verifying your email...</h1>
            <p className="text-xs text-muted">
              Confirming your cryptographic token with the security server.
            </p>
          </div>
        )}

        {/* State: Success */}
        {status === "success" && (
          <div className="space-y-4 py-4 animate-in fade-in">
            <div className="mx-auto grid size-16 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800">
              <CheckCircle2 size={36} />
            </div>
            <h1 className="text-2xl font-semibold text-ink">Email Verified!</h1>
            <p className="text-xs text-muted leading-relaxed">
              Your email address has been successfully confirmed. You now have full access to
              autonomous interview simulations, speech cadence analytics, and system design sandboxes.
            </p>
            <div className="pt-4">
              <Link
                href="/onboarding"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-moss py-3 text-sm font-semibold text-white transition hover:bg-moss"
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
                <div className="mx-auto grid size-16 place-items-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-800">
                  <XCircle size={36} />
                </div>
                <h1 className="text-xl font-semibold text-ink">Verification Link Expired</h1>
                <p className="text-xs text-red-800 bg-red-50 border border-red-900/30 p-2.5 rounded-xl">
                  {errorMessage || "This link is invalid or has already been used."}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto grid size-16 place-items-center rounded-xl bg-paper border border-line text-moss">
                  <Mail size={32} />
                </div>
                <h1 className="text-xl font-semibold text-ink">Verify Your Email</h1>
                <p className="text-xs text-muted">
                  Need a new verification link? Enter your email address below to receive one.
                </p>
              </>
            )}

            {resendSuccess ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-800">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-800" />
                <p className="font-semibold text-emerald-800">Verification email dispatched!</p>
                <p className="mt-1 text-ink">
                  If an account matches <strong className="text-ink">{resendEmail}</strong>, check
                  your inbox for a fresh link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 text-left" noValidate>
                <div>
                  <label htmlFor="resend-email" className="block text-xs font-medium text-ink mb-1">
                    Your account email
                  </label>
                  <input
                    id="resend-email"
                    aria-invalid={Boolean(resendError)}
                    aria-describedby={resendError ? "resend-email-error" : undefined}
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => {
                      setResendEmail(e.target.value);
                      if (resendError) setResendError("");
                    }}
                    placeholder="alex@company.com"
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:border-moss/80 focus:outline-none transition"
                  />
                  {resendError && <p id="resend-email-error" role="alert" className="mt-1 text-xs text-red-800">{resendError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-xs font-semibold text-ink hover:bg-paper transition cursor-pointer disabled:opacity-50"
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

            <div className="pt-2 text-center text-xs text-muted">
              <Link href="/login" className="hover:text-ink transition">
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
        <div className="flex min-h-[68vh] items-center justify-center">
          <Loader2 size={32} className="animate-spin text-moss" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
