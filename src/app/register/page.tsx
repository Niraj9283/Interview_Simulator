"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrainCircuit, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { evaluatePasswordStrength, validateEmail, validateFullName, validatePasswordMatch } from "@/lib/validation";
import { PasswordVisibilityToggle } from "@/components/features/password-visibility-toggle";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "interviewer">("candidate");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Errors & States
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [termsError, setTermsError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const passwordStrength = evaluatePasswordStrength(password);

  // If already logged in, redirect home
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setTermsError("");
    setGeneralError("");

    // Field-level validations
    const nameVal = validateFullName(fullName);
    if (!nameVal.isValid) {
      setNameError(nameVal.error || "Name is required");
      return;
    }

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      setEmailError(emailVal.error || "Invalid email");
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

    if (!agreedToTerms) {
      setTermsError("You must agree to the Terms of Service and Privacy Policy to create an account.");
      return;
    }

    setIsSubmitting(true);
    const result = await register(fullName, email, password, role);
    setIsSubmitting(false);

    if (result.success) {
      setRegistrationSuccess(true);
    } else {
      setGeneralError(result.error || "Registration could not be completed. Please try again.");
    }
  };

  if (registrationSuccess) {
    return (
            <div className="flex min-h-[72vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
              <div className="w-full max-w-md text-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl space-y-5">
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                  <h2 className="text-xl font-semibold text-zinc-100">Check your email</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    We sent a verification link to <strong className="text-zinc-200">{email}</strong>.
                    Please verify your email address to unlock interview sessions and analytics.
                  </p>
                    <div className="pt-2 flex flex-col gap-2.5">
                      <Link
                        href="/onboarding"
                        className="w-full rounded-lg bg-zinc-100 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-white"
                      >
                        Continue to Onboarding
                      </Link>
                      <Link
                        href="/verify-email"
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                      >
                        Enter token manually or resend email
                      </Link>
                    </div>
                  </div>
              </div>
              );
  }

              return (
                  <div className="flex min-h-[72vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                    <div className="w-full max-w-md space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                      {/* Header */}
                      <div className="text-center">
                          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
                            <div className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-950 font-semibold shadow-xs">
                              <BrainCircuit size={18} />
                            </div>
                            <span className="text-sm font-semibold text-zinc-100">
                              MockMate<span className="text-zinc-400">.ai</span>
                            </span>
                          </Link>
                          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
                            Create your account
                          </h1>
                            <p className="mt-1 text-xs text-zinc-400">
                              Save your practice sessions, benchmarks, and personalized roadmaps.
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
                                <p className="font-medium text-rose-300">Registration failed</p>
                                <p className="mt-0.5 text-zinc-300">{generalError}</p>
                              </div>
                            </div>
                          )}

                          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            {/* Full Name */}
                            <div>
                                <label htmlFor="fullName" className="block text-xs font-medium text-zinc-300 mb-1">
                                  Full Name
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                                      <User size={15} />
                                    </div>
                                    <input
                                      id="fullName"
                                      aria-invalid={Boolean(nameError)}
                                      aria-describedby={nameError ? "fullName-error" : undefined}
                                      type="text"
                                      required
                                      disabled={isSubmitting}
                                      value={fullName}
                                      onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (nameError) setNameError("");
                                      }}
                                      placeholder="Alex Rivera"
                                      className={`w-full rounded-lg border bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition ${
                                        nameError
                                          ? "border-rose-500 focus:border-rose-500"
                                          : "border-zinc-800 focus:border-zinc-600"
                                      }`}
              />
            </div>
            {nameError && <p id="fullName-error" role="alert" className="mt-1 text-xs text-rose-400">{nameError}</p>}
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-300 mb-1">
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
                placeholder="alex@company.com"
                                      className = {`w-full rounded-lg border bg-zinc-950 py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition ${emailError
                                            ? "border-rose-500 focus:border-rose-500"
                                            : "border-zinc-800 focus:border-zinc-600"
                                        }`}
              />
                                  </div>
                                  {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-rose-400">{emailError}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <label htmlFor="password" className="block text-xs font-medium text-zinc-300 mb-1">
                                      Password
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                                          <Lock size={15} />
                                        </div>
                                        <input
                                          id="password"
                                          aria-invalid={Boolean(passwordError)}
                                          aria-describedby={passwordError ? "password-error" : undefined}
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
                                          className={`w-full rounded-lg border bg-zinc-950 py-2 pl-9 pr-9 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition ${
                                            passwordError
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

                                {/* Confirm Password */}
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-300 mb-1">
                                      Confirm Password
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                                          <Lock size={15} />
                                        </div>
                                        <input
                                          id="confirmPassword"
                                          aria-invalid={Boolean(confirmError)}
                                          aria-describedby={confirmError ? "confirm-error" : undefined}
                                          type={showConfirmPassword ? "text" : "password"}
                                          autoComplete="new-password"
                                          required
                                          disabled={isSubmitting}
                                          value={confirmPassword}
                                          onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (confirmError) setConfirmError("");
                                          }}
                className={`w-full rounded-lg border bg-zinc-950 py-2 pl-9 pr-9 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition ${confirmError
                                                ? "border-rose-500 focus:border-rose-500"
                                                : "border-zinc-800 focus:border-zinc-600"
                                            }`}
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                          <PasswordVisibilityToggle
                                            isVisible={showConfirmPassword}
                                            onToggle={() => setShowConfirmPassword((prev) => !prev)}
                                          />
                                        </div>
                                      </div>
                                      {confirmError && <p id="confirm-error" role="alert" className="mt-1 text-xs text-rose-400">{confirmError}</p>}
                                    </div>

                                    {/* Terms checkbox */}
                                    <div>
                                      <div className="flex items-start">
                                        <input
                                          id="agree-terms"
                                          type="checkbox"
                                          checked={agreedToTerms}
                                          onChange={(e) => {
                                            setAgreedToTerms(e.target.checked);
                                            if (termsError) setTermsError("");
                                          }}
                                          className="mt-0.5 size-3.5 rounded border-zinc-800 bg-zinc-950 text-blue-500"
                                        />
                                          <label htmlFor="agree-terms" className="ml-2 block text-xs text-zinc-400 leading-snug cursor-pointer">
                                            I agree to the{" "}
                                              <Link href="/terms" className="text-zinc-200 underline hover:text-white">
                                                Terms of Service
                                              </Link>{" "}
                                                and{" "}
                                                <Link href="/privacy" className="text-zinc-200 underline hover:text-white">
                                                  Privacy Policy
                                                </Link>
                                                .
                                              </label>
                                            </div>
                                            {termsError && <p role="alert" className="mt-1 text-xs text-rose-400">{termsError}</p>}
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
                                                <span>Creating account...</span>
                                              </>
                                            ) : (
                                              <>
                                                <span>Create account</span>
                                                <ArrowRight size={14} />
                                              </>
                                            )}
                                          </button>
                                        </form>

                                          {/* Footer Link */}
                                          <div className="pt-3 text-center border-t border-zinc-800 text-xs text-zinc-400">
                                            Already have an account?{" "}
                                              <Link href="/login" className="font-medium text-zinc-200 hover:underline">
                                                Sign in
                                              </Link>
                                          </div>
                                        </div>
                                      </div>
                                      );
}
