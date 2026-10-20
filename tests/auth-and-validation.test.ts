import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateEmail,
  validateFullName,
  evaluatePasswordStrength,
  validatePasswordMatch,
  validateDeleteConfirmation,
} from "../src/lib/validation";
import { normalizeErrorMessage, ApiError } from "../src/lib/api-client";
import { sanitizeProperties } from "../src/lib/analytics";

describe("Frontend Form Validation & Security Helpers", () => {
  it("1. Validates email formats correctly", () => {
    assert.equal(validateEmail("user@example.com").isValid, true);
    assert.equal(validateEmail("candidate.john+work@sub.domain.org").isValid, true);
    assert.equal(validateEmail("").isValid, false);
    assert.equal(validateEmail("notanemail").isValid, false);
    assert.equal(validateEmail("missing@domain").isValid, false);
    assert.equal(validateEmail("@nodomain.com").isValid, false);
  });

  it("2. Validates candidate full name length and presence", () => {
    assert.equal(validateFullName("Alice Engineer").isValid, true);
    assert.equal(validateFullName("").isValid, false);
    assert.equal(validateFullName("A").isValid, false);
    assert.equal(validateFullName("   ").isValid, false);
  });

  it("3. Evaluates password strength dynamically", () => {
    const weak = evaluatePasswordStrength("short");
    assert.equal(weak.isValid, false);
    assert.equal(weak.score, 0);
    assert.equal(weak.label, "Too Weak");
    assert.ok(weak.feedback.includes("At least 8 characters"));

    const medium = evaluatePasswordStrength("Password123");
    assert.ok(medium.score >= 2);
    assert.equal(medium.isValid, true);

    const strong = evaluatePasswordStrength("Tr0ng!P@ssw0rd2026#Secure");
    assert.equal(strong.score, 4);
    assert.equal(strong.label, "Strong");
    assert.equal(strong.isValid, true);
    assert.equal(strong.feedback.length, 0);
  });

  it("4. Validates password confirmation match", () => {
    assert.equal(validatePasswordMatch("Pass1234!", "Pass1234!").isValid, true);
    assert.equal(validatePasswordMatch("Pass1234!", "Different!").isValid, false);
    assert.equal(validatePasswordMatch("Pass1234!", "").isValid, false);
  });

  it("5. Validates delete account confirmation phrase", () => {
    assert.equal(validateDeleteConfirmation("DELETE").isValid, true);
    assert.equal(validateDeleteConfirmation("delete").isValid, true);
    assert.equal(validateDeleteConfirmation("cancel").isValid, false);
    assert.equal(validateDeleteConfirmation("").isValid, false);
  });
});

describe("API Error Normalization & Security Scrubbing", () => {
  it("6. Normalizes HTTP 401 Unauthorized errors", () => {
    const defaultMsg = normalizeErrorMessage(401);
    assert.ok(defaultMsg.includes("expired") || defaultMsg.includes("log in"));

    const customMsg = normalizeErrorMessage(401, { detail: "Invalid email or password" });
    assert.equal(customMsg, "Invalid email or password");
  });

  it("7. Normalizes HTTP 429 Rate Limit error", () => {
    const msg = normalizeErrorMessage(429);
    assert.ok(msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many requests"));
  });

  it("8. Scrubs internal Python traces, SQL details, and paths from 500 responses", () => {
    const rawTraceback = {
      detail: "Traceback (most recent call last):\n  File '/app/user_db.py', line 45\n sqlite3.OperationalError: database locked",
    };
    const cleanMsg = normalizeErrorMessage(500, rawTraceback);
    assert.ok(!cleanMsg.includes("Traceback"));
    assert.ok(!cleanMsg.includes("sqlite3"));
    assert.ok(!cleanMsg.includes("/app/user_db.py"));
    assert.ok(cleanMsg.includes("server error"));
  });

  it("9. Instantiates ApiError class with status and request correlation ID", () => {
    const apiError = new ApiError(404, "Not Found", "Session not found", "req-xyz-123", 30);
    assert.equal(apiError.status, 404);
    assert.equal(apiError.message, "Not Found");
    assert.equal(apiError.requestId, "req-xyz-123");
    assert.equal(apiError.retryAfter, 30);
  });
});

describe("Privacy & PII Scrubbing in Analytics", () => {
  it("10. Scrubs passwords, bearer tokens, emails, resumes, and interview transcripts", () => {
    const scrubbed = sanitizeProperties({
      role: "Staff Engineer",
      score: 92,
      password: "secret_password_123",
      token: "eyJhbGciOi...",
      authorization: "Bearer secret",
      email: "candidate@gmail.com",
      resume_text: "Confidential resume data",
      answer_transcript: "My confidential answer",
    });

    assert.equal(scrubbed.role, "Staff Engineer");
    assert.equal(scrubbed.score, 92);
    assert.equal(scrubbed.password, undefined);
    assert.equal(scrubbed.token, undefined);
    assert.equal(scrubbed.authorization, undefined);
    assert.equal(scrubbed.email, undefined);
    assert.equal(scrubbed.resume_text, undefined);
    assert.equal(scrubbed.answer_transcript, undefined);
  });
});
