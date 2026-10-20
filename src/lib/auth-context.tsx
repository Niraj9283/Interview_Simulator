"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiFetch, ApiError } from "./api-client";
import { trackAnalyticsEvent } from "./analytics";
import { showToast } from "@/components/ui/toast";

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  name?: string;
  role: "admin" | "interviewer" | "candidate";
  email_verified: boolean;
  onboarding_completed: boolean;
  target_role?: string | null;
  experience_level?: string | null;
  department?: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  updateOnboarding: (data: { target_role: string; department: string; experience_level: string }) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiFetch<UserProfile>("/api/auth/me");
      if (userData && !userData.name) {
        userData.name = userData.full_name;
      }
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialUser = async () => {
      try {
        const userData = await apiFetch<UserProfile>("/api/auth/me");
        if (userData && !userData.name) {
          userData.name = userData.full_name;
        }
        if (isMounted) setUser(userData);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login action
  const login = async (email: string, password: string, rememberMe = true) => {
    setIsLoading(true);
    try {
      await apiFetch<{ access_token: string; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      // Retrieve full profile
      const profile = await apiFetch<UserProfile>("/api/auth/me");
      setUser(profile);

      trackAnalyticsEvent("login_completed", { role: profile.role });
      showToast({
        type: "success",
        title: "Welcome back!",
        message: `Signed in as ${profile.full_name}`,
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Invalid credentials";
      showToast({ type: "error", title: "Login Failed", message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Register action
  const register = async (fullName: string, email: string, password: string, role = "candidate") => {
    setIsLoading(true);
    try {
      await apiFetch<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });

      const profile = await apiFetch<UserProfile>("/api/auth/me");
      setUser(profile);

      trackAnalyticsEvent("registration_completed", { role });
      showToast({
        type: "success",
        title: "Account Created",
        message: "A verification email has been dispatched. Please confirm your email address.",
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      showToast({ type: "error", title: "Registration Error", message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    setUser(null);
    showToast({
      type: "info",
      title: "Signed Out",
      message: "You have been safely logged out.",
    });
  };

  // Verify email action
  const verifyEmail = async (token: string) => {
    try {
      const res = await apiFetch<{ status: string; message: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await refreshUser();
      showToast({ type: "success", title: "Email Verified", message: res.message });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Verification failed";
      showToast({ type: "error", title: "Verification Failed", message });
      return { success: false, error: message };
    }
  };

  // Resend verification
  const resendVerification = async (email: string) => {
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      showToast({ type: "info", title: "Verification Link Sent", message: res.message });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Could not send verification email";
      return { success: false, message };
    }
  };

  // Forgot password
  const forgotPassword = async (email: string) => {
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      showToast({ type: "info", title: "Reset Link Sent", message: res.message });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to request password reset";
      return { success: false, message };
    }
  };

  // Reset password
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      showToast({ type: "success", title: "Password Reset", message: res.message });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to reset password";
      showToast({ type: "error", title: "Reset Failed", message });
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      showToast({ type: "success", title: "Password Changed", message: res.message });
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to update password";
      showToast({ type: "error", title: "Update Failed", message });
      return { success: false, error: message };
    }
  };

  // Save onboarding preferences
  const updateOnboarding = async (data: { target_role: string; department: string; experience_level: string }) => {
    try {
      await apiFetch("/api/auth/onboarding", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      await refreshUser();
      trackAnalyticsEvent("onboarding_completed", { department: data.department });
      showToast({ type: "success", title: "Onboarding Saved", message: "Your simulation preferences are active." });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Could not save onboarding preferences";
      showToast({ type: "error", title: "Error", message });
      return { success: false, error: message };
    }
  };

  // Delete account
  const deleteAccount = async (password: string) => {
    try {
      await apiFetch("/api/auth/delete-account", {
        method: "POST",
        body: JSON.stringify({ password, confirmation: "DELETE" }),
      });
      setUser(null);
      showToast({
        type: "info",
        title: "Account Deleted",
        message: "Your profile and simulation data have been permanently erased.",
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to delete account";
      showToast({ type: "error", title: "Deletion Failed", message });
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isEmailVerified: !!user?.email_verified,
        isOnboarded: !!user?.onboarding_completed,
        login,
        register,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        changePassword,
        updateOnboarding,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
