"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Key,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  User,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { evaluatePasswordStrength, validatePasswordMatch } from "@/lib/validation";
import { PasswordVisibilityToggle } from "@/components/features/password-visibility-toggle";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, changePassword, deleteAccount } = useAuth();

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const newPasswordStrength = evaluatePasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPasswordStrength.isValid) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    const matchVal = validatePasswordMatch(newPassword, confirmPassword);
    if (!matchVal.isValid) {
      setPasswordError(matchVal.error || "Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (result.success) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError(result.error || "Failed to update password.");
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("Password is required to confirm account deletion.");
      return;
    }

    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Please type DELETE to proceed.");
      return;
    }

    setIsDeleting(true);
    const result = await deleteAccount(deletePassword);
    setIsDeleting(false);

    if (result.success) {
      router.push("/");
    } else {
      setDeleteError(result.error || "Could not delete account. Check your password.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#FF4D3D]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#222222] bg-[#121212] p-8 text-center space-y-4">
          <AlertCircle size={32} className="mx-auto text-amber-400" />
          <h1 className="text-xl font-bold text-white">Authentication Required</h1>
          <p className="text-xs text-[#888888]">
            Please sign in to access security settings and manage your account.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF4D3D] px-6 py-2.5 text-xs font-bold text-neutral-950 hover:bg-[#ff3826] transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[85vh] max-w-4xl px-4 py-12 sm:px-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4D3D]/30 bg-[#FF4D3D]/10 px-3 py-1 text-xs font-semibold text-[#FF4D3D] mb-3">
          <ShieldCheck size={14} />
          <span>Security & Governance</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Security Settings</h1>
        <p className="mt-1 text-xs sm:text-sm text-[#888888]">
          Manage your credentials, session revocation, and data isolation controls.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Account Profile Overview */}
        <div className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] mb-4 flex items-center gap-2">
            <User size={16} className="text-[#FF4D3D]" />
            <span>Profile Information</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-[#222222] bg-[#161616] p-3.5 space-y-1">
              <span className="text-[#888888]">Full Name</span>
              <p className="font-semibold text-white text-sm">{user.full_name}</p>
            </div>
            <div className="rounded-xl border border-[#222222] bg-[#161616] p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#888888]">Email Address</span>
                {user.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 size={12} />
                    Verified
                  </span>
                ) : (
                  <Link
                    href="/verify-email"
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Unverified (Click to verify)
                  </Link>
                )}
              </div>
              <p className="font-semibold text-white text-sm">{user.email}</p>
            </div>
            <div className="rounded-xl border border-[#222222] bg-[#161616] p-3.5 space-y-1">
              <span className="text-[#888888]">Account Role</span>
              <p className="font-semibold text-white capitalize">{user.role}</p>
            </div>
            <div className="rounded-xl border border-[#222222] bg-[#161616] p-3.5 space-y-1">
              <span className="text-[#888888]">Member Since</span>
              <p className="font-semibold text-white">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Active Member"}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Password Update */}
        <div className="rounded-2xl border border-[#222222] bg-[#121212]/95 p-6 backdrop-blur-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] mb-4 flex items-center gap-2">
            <Key size={16} className="text-[#FF4D3D]" />
            <span>Update Password</span>
          </h2>

          {passwordSuccess && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Password updated successfully. Other active sessions were invalidated.</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md" noValidate>
            <div>
              <label className="block text-xs font-medium text-[#D4D4D4] mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-[#555555] focus:border-[#FF4D3D]/80 focus:outline-none"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <PasswordVisibilityToggle
                    isVisible={showCurrent}
                    onToggle={() => setShowCurrent((p) => !p)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D4D4D4] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-[#555555] focus:border-[#FF4D3D]/80 focus:outline-none"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <PasswordVisibilityToggle
                    isVisible={showNew}
                    onToggle={() => setShowNew((p) => !p)}
                  />
                </div>
              </div>
              {newPassword && (
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[#888888]">Strength:</span>
                  <span className="font-semibold" style={{ color: newPasswordStrength.color }}>
                    {newPasswordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D4D4D4] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-[#555555] focus:border-[#FF4D3D]/80 focus:outline-none"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <PasswordVisibilityToggle
                    isVisible={showConfirm}
                    onToggle={() => setShowConfirm((p) => !p)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="flex items-center gap-2 rounded-xl bg-[#222222] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2c2c2c] transition cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        </div>

        {/* Section 3: Danger Zone (Account Deletion) */}
        <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Danger Zone: Delete Account</h2>
              <p className="mt-1 text-xs text-[#A0A0A0] leading-relaxed">
                Permanently erase your account, all simulated interview recordings, AI evaluations,
                scores, resume analyses, and custom preferences. This action is irreversible.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-600/20 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-600/30 transition cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#141414] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-red-500/20 text-red-400">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Account Deletion</h3>
                <p className="text-xs text-[#888888]">Irreversible data erasure</p>
              </div>
            </div>

            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              This will permanently delete your user profile, all recorded interview transcripts,
              STAR scores, and indexed resumes. You will immediately be signed out.
            </p>

            {deleteError && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-2.5 text-xs text-red-300">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D4] mb-1">
                  Enter your password to verify ownership:
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-[#555555] focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4D4D4] mb-1">
                  Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-[#2A2A2A] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-[#555555] focus:border-red-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteError("");
                  }}
                  className="rounded-xl border border-[#2A2A2A] px-4 py-2 text-xs font-semibold text-[#888888] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || deleteConfirmation.trim().toUpperCase() !== "DELETE"}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Permanently Erase Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
