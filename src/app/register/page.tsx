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
      <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md text-center rounded-2xl border border-[#222222] bg-[#121212]/95 p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-white">Check your email</h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            We sent a verification link to <strong className="text-white">{email}</strong>.
            Please verify your email address to unlock AI interview simulation and analytics.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <Link
              href="/onboarding"
              className="w-full rounded-xl bg-[#FF4D3D] py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-[#FF4D3D]/30 transition hover:bg-[#ff3826]"
            >
              Continue to Onboarding
            </Link>
            <Link
              href="/verify-email"
              className="text-xs text-[#A0A0A0] hover:text-white transition"
            >
              Enter token manually or resend email
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
            Create your account
          </h1>
          <p className="mt-1 text-xs text-[#A0A0A0]">
            Autonomous speech analytics and AI interview preparation
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
              <p className="font-semibold text-red-300">Registration failed</p>
              <p className="mt-0.5 text-neutral-300">{generalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-xs font-medium text-[#D4D4D4] mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#737373]">
                <User size={16} />
              </div>
              <input
                id="fullName"
                type="text"
                required
                disabled={isSubmitting}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Alex Rivera"
                className={`w-full rounded-xl border bg-[#181818] py-2.5 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none transition ${
                  nameError
                    ? "border-red-500 focus:border-red-500"
                    : "border-[#2A2A2A] focus:border-[#FF4D3D]/80"
                }`}
              />
            </div>
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#D4D4D4] mb-1">
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#D4D4D4] mb-1">
              Password
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

            {/* Password Strength Meter */}
            {password && (
              <div className="mt-2 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#888888]">Password Strength:</span>
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
                {passwordStrength.feedback.length > 0 && (
                  <p className="text-[10px] text-[#888888]">
                    Suggested: {passwordStrength.feedback.join(", ")}
                  </p>
                )}
              </div>
            )}
            {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#D4D4D4] mb-1">
              Confirm Password
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
                placeholder="Repeat password"
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

          {/* Role selection */}
          <div>
            <label className="block text-xs font-medium text-[#D4D4D4] mb-1">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`rounded-xl border p-2.5 text-xs font-medium transition cursor-pointer ${
                  role === "candidate"
                    ? "border-[#FF4D3D] bg-[#FF4D3D]/10 text-white"
                    : "border-[#2A2A2A] bg-[#161616] text-[#888888] hover:text-white"
                }`}
              >
                Candidate
              </button>
              <button
                type="button"
                onClick={() => setRole("interviewer")}
                className={`rounded-xl border p-2.5 text-xs font-medium transition cursor-pointer ${
                  role === "interviewer"
                    ? "border-[#FF4D3D] bg-[#FF4D3D]/10 text-white"
                    : "border-[#2A2A2A] bg-[#161616] text-[#888888] hover:text-white"
                }`}
              >
                Interviewer / Recruiter
              </button>
            </div>
          </div>

          {/* Terms Agreement */}
          <div>
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (termsError) setTermsError("");
                }}
                className="mt-0.5 size-4 rounded border-[#333333] bg-[#1a1a1a] text-[#FF4D3D] focus:ring-[#FF4D3D]/50 focus:ring-offset-0"
              />
              <label htmlFor="terms" className="ml-2 block text-xs text-[#A0A0A0] leading-snug cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-[#FF4D3D] hover:underline font-medium">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/privacy" target="_blank" className="text-[#FF4D3D] hover:underline font-medium">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {termsError && <p className="mt-1 text-xs text-red-400">{termsError}</p>}
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-4 text-center border-t border-[#222222] text-xs text-[#A0A0A0]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#FF4D3D] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
