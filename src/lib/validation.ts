/**
 * Form Validation Utilities & Password Strength Scoring
 */

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Too Weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: string;
  feedback: string[];
  isValid: boolean;
}

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: "Email address is required." };
  }
  if (trimmed.length > 120) {
    return { isValid: false, error: "Email must not exceed 120 characters." };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address (e.g., name@domain.com)." };
  }
  return { isValid: true };
}

export function validateFullName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: "Full name is required." };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: "Full name must be at least 2 characters long." };
  }
  if (trimmed.length > 100) {
    return { isValid: false, error: "Full name must not exceed 100 characters." };
  }
  return { isValid: true };
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];

  if (password.length < 8) {
    feedback.push("At least 8 characters");
  }
  if (!/[a-z]/.test(password)) {
    feedback.push("Lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push("Uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    feedback.push("Number");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push("Special symbol (!@#$%^&*)");
  }

  const passedCriteria = 5 - feedback.length;
  let score = 0;
  if (password.length >= 8) {
    if (passedCriteria <= 2) score = 1;
    else if (passedCriteria === 3) score = 2;
    else if (passedCriteria === 4) score = 3;
    else if (passedCriteria === 5) score = 4;
  }

  const strengthMap: Record<number, { label: PasswordStrength["label"]; color: string }> = {
    0: { label: "Too Weak", color: "#EF4444" },
    1: { label: "Weak", color: "#F97316" },
    2: { label: "Fair", color: "#FBBF24" },
    3: { label: "Good", color: "#34D399" },
    4: { label: "Strong", color: "#10B981" },
  };

  return {
    score,
    label: strengthMap[score].label,
    color: strengthMap[score].color,
    feedback,
    isValid: password.length >= 8,
  };
}

export function validatePasswordMatch(password: string, confirm: string): { isValid: boolean; error?: string } {
  if (!confirm) {
    return { isValid: false, error: "Please confirm your password." };
  }
  if (password !== confirm) {
    return { isValid: false, error: "Passwords do not match." };
  }
  return { isValid: true };
}

export function validateDeleteConfirmation(confirmation: string): { isValid: boolean; error?: string } {
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { isValid: false, error: "Please type DELETE to confirm account deletion." };
  }
  return { isValid: true };
}
