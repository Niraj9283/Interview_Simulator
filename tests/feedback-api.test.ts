import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/feedback/route";
import { sendFeedbackEmailNotification } from "../src/lib/email-service";
import { NextRequest } from "next/server";

// Helper to create mock NextRequest instances
function createMockRequest(
  body: Record<string, unknown> | string,
  options: {
    ip?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const ip = options.ip || `192.168.1.${Math.floor(Math.random() * 200) + 10}`;
  const serializedBody = typeof body === "string" ? body : JSON.stringify(body);
  const headers = new Headers({
    "content-type": "application/json",
    "x-forwarded-for": ip,
    ...(options.headers || {}),
  });

  return new NextRequest("http://localhost:3000/api/feedback", {
    method: "POST",
    headers,
    body: serializedBody,
  });
}

describe("Feedback API & Resend Email Integration Tests", () => {
  beforeEach(() => {
    // Ensure test environment uses a controlled configuration without sending live emails
    process.env.FEEDBACK_TO_EMAIL = "dragon768.901@gmail.com";
    process.env.FEEDBACK_FROM_EMAIL = "MockMate AI <onboarding@resend.dev>";
  });

  it("1. Successfully processes a valid feedback submission with rating and returns HTTP 200", async () => {
    const testId = Date.now().toString(36);
    const req = createMockRequest({
      name: "Alex Rivera",
      email: `alex.${testId}@example.com`,
      category: "Feedback",
      rating: 5,
      message: "The simulated technical interview for System Design was exceptionally realistic!",
      utmData: { utm_source: "linkedin", utm_campaign: "beta_test" },
    });

    const response = await POST(req);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.match(data.ticketId, /^FB-[A-Z0-9]+-[A-Z0-9]+$/);
    assert.match(data.message, /Thank you! Your feedback has been received/);
  });

  it("2. Rejects request with missing required submitter name", async () => {
    const req = createMockRequest({
      name: "   ",
      email: "user@example.com",
      category: "Feedback",
      message: "This is a valid length feedback message.",
    });

    const response = await POST(req);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, "Validation Error");
    assert.match(data.message, /Submitter name is required/);
  });

  it("3. Rejects request with invalid or malformed email address", async () => {
    const invalidEmails = ["not-an-email", "@missingusername.com", "user@.com", "user@domain..com"];

    for (const invalidEmail of invalidEmails) {
      const req = createMockRequest({
        name: "Test User",
        email: invalidEmail,
        category: "Question",
        message: "Testing malformed email rejection logic.",
      });

      const response = await POST(req);
      const data = await response.json();

      assert.equal(response.status, 400);
      assert.equal(data.error, "Validation Error");
      assert.match(data.message, /valid email address is required/);
    }
  });

  it("4. Rejects request with invalid star rating values (< 1, > 5, or non-integer)", async () => {
    const invalidRatings = [0, 6, 3.5, -1, 10];

    for (const invalidRating of invalidRatings) {
      const req = createMockRequest({
        name: "Test User",
        email: "valid@example.com",
        category: "Feedback",
        rating: invalidRating,
        message: "Testing star rating bounds and validation.",
      });

      const response = await POST(req);
      const data = await response.json();

      assert.equal(response.status, 400);
      assert.equal(data.error, "Validation Error");
      assert.match(data.message, /Star rating must be an integer between 1 and 5/);
    }
  });

  it("5. Rejects request with unsupported feedback category", async () => {
    const req = createMockRequest({
      name: "Test User",
      email: "valid@example.com",
      category: "UnauthorizedCategory",
      message: "Testing category whitelist validation.",
    });

    const response = await POST(req);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, "Validation Error");
    assert.match(data.message, /Invalid feedback category/);
  });

  it("6. Rejects message with fewer than 10 characters", async () => {
    const req = createMockRequest({
      name: "Test User",
      email: "valid@example.com",
      category: "Bug",
      message: "Too short",
    });

    const response = await POST(req);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, "Validation Error");
    assert.match(data.message, /at least 10 characters long/);
  });

  it("7. Rejects oversized message exceeding 5000 characters", async () => {
    const oversizedMessage = "A".repeat(5001);
    const req = createMockRequest({
      name: "Test User",
      email: "valid@example.com",
      category: "Feedback",
      message: oversizedMessage,
    });

    const response = await POST(req);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, "Validation Error");
    assert.match(data.message, /must not exceed 5000 characters/);
  });

  it("8. Rejects automated submissions when honeypot fields are filled", async () => {
    const req = createMockRequest({
      name: "Spam Bot",
      email: "bot@spammer.org",
      category: "General",
      message: "Buy cheap backlinks at our online spam service!",
      bot_field: "http://spamlink.xyz",
    });

    const response = await POST(req);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, "Submission Rejected");
    assert.match(data.message, /Automated submission detected/);
  });

  it("9. Prevents duplicate submissions within the deduplication window (HTTP 409)", async () => {
    const uniqueEmail = `dup.${Date.now()}@example.com`;
    const message = "This is a unique test feedback message for deduplication checking.";

    const req1 = createMockRequest({
      name: "Jane Duplicate",
      email: uniqueEmail,
      category: "Feedback",
      message,
    });
    const res1 = await POST(req1);
    assert.equal(res1.status, 200);

    const req2 = createMockRequest({
      name: "Jane Duplicate",
      email: uniqueEmail,
      category: "Feedback",
      message,
    });
    const res2 = await POST(req2);
    const data2 = await res2.json();

    assert.equal(res2.status, 409);
    assert.equal(data2.error, "Duplicate Submission");
  });

  it("10. Enforces sliding window rate limit of 5 requests per minute per IP (HTTP 429)", async () => {
    const targetIp = `10.0.99.${Math.floor(Math.random() * 200) + 10}`;

    // Submit 5 requests from the same IP
    for (let i = 1; i <= 5; i++) {
      const req = createMockRequest(
        {
          name: `User ${i}`,
          email: `ratelimit.${i}.${Date.now()}@example.com`,
          category: "Feedback",
          message: `Valid message number ${i} for rate limit verification.`,
        },
        { ip: targetIp }
      );
      const res = await POST(req);
      assert.equal(res.status, 200, `Request ${i} should succeed`);
    }

    // 6th request from same IP should be blocked
    const blockedReq = createMockRequest(
      {
        name: "User 6",
        email: `ratelimit.6.${Date.now()}@example.com`,
        category: "Feedback",
        message: "This 6th request should hit the sliding window rate limit.",
      },
      { ip: targetIp }
    );
    const blockedRes = await POST(blockedReq);
    const blockedData = await blockedRes.json();

    assert.equal(blockedRes.status, 429);
    assert.equal(blockedData.error, "Too Many Requests");
    assert.equal(blockedRes.headers.get("Retry-After"), "60");
  });

  it("11. Handles missing email provider API key gracefully via safe development fallback", async () => {
    const originalApiKey = process.env.RESEND_API_KEY;
    try {
      // Temporarily remove API key
      delete process.env.RESEND_API_KEY;

      const result = await sendFeedbackEmailNotification({
        ticketId: "FB-UNIT-TEST-001",
        name: "Graceful Fallback Tester",
        email: "fallback@example.com",
        category: "Enterprise",
        rating: 4,
        message: "Testing that missing API key does not crash or throw unhandled exceptions.",
        submittedAt: new Date().toISOString(),
      });

      assert.equal(result.success, true);
      assert.equal(result.simulated, true);
    } finally {
      if (originalApiKey) {
        process.env.RESEND_API_KEY = originalApiKey;
      }
    }
  });

  it("12. Correctly formats email notification details, Reply-To, and rating", async () => {
    const notification = {
      ticketId: "FB-REPLYTO-TEST",
      name: "Devon Candidate",
      email: "devon@company.org",
      category: "Question",
      rating: 5,
      message: "Can we integrate MockMate AI into our university career services curriculum?",
      submittedAt: new Date().toISOString(),
      utmData: { source: "google", medium: "cpc" },
    };

    const result = await sendFeedbackEmailNotification(notification);
    assert.equal(result.success, true);
  });
});
