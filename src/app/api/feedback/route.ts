import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Allowed categories
export const ALLOWED_CATEGORIES = [
  "Feedback",
  "Bug",
  "Question",
  "Enterprise",
  "General",
] as const;

export type FeedbackCategory = (typeof ALLOWED_CATEGORIES)[number];

// Rate limiting: Client IP -> timestamp array (Sliding Window)
const ipRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_FEEDBACK_PER_MINUTE = 5;

// Deduplication: Hash(email + message) -> timestamp
const recentSubmissions = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 60 * 1000; // 60 seconds

// Max payload size in bytes (50 KB)
const MAX_PAYLOAD_BYTES = 51200;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequests.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_FEEDBACK_PER_MINUTE) {
    return true;
  }

  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return false;
}

function isDuplicateSubmission(email: string, message: string): boolean {
  const now = Date.now();
  const hash = crypto
    .createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${message.toLowerCase().trim()}`)
    .digest("hex");

  const lastSubmitted = recentSubmissions.get(hash);
  if (lastSubmitted && now - lastSubmitted < DEDUPLICATION_WINDOW_MS) {
    return true;
  }

  // Cleanup old entries
  for (const [key, timestamp] of recentSubmissions.entries()) {
    if (now - timestamp > DEDUPLICATION_WINDOW_MS) {
      recentSubmissions.delete(key);
    }
  }

  recentSubmissions.set(hash, now);
  return false;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce payload size limit
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Payload Too Large", message: "Feedback payload exceeds 50KB limit." },
        { status: 413 }
      );
    }

    // 2. Client IP & Rate Limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit reached. Please wait a minute before submitting additional feedback.",
        },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    // Parse Body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request", message: "Malformed JSON payload in request." },
        { status: 400 }
      );
    }

    // 3. Bot Protection (Honeypot)
    // If a bot fills hidden fields (bot_field, website, hp_auth), reject immediately
    if (body.bot_field || body.website || body.hp_auth) {
      return NextResponse.json(
        { error: "Submission Rejected", message: "Automated submission detected." },
        { status: 400 }
      );
    }

    const { name, email, category, rating, message, utmData } = body;

    // 4. Server-Side Field Validation
    // Name validation
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Validation Error", message: "Submitter name is required." },
        { status: 400 }
      );
    }
    const cleanName = name.trim();
    if (cleanName.length > 100) {
      return NextResponse.json(
        { error: "Validation Error", message: "Name must not exceed 100 characters." },
        { status: 400 }
      );
    }

    // Email validation
    if (typeof email !== "string" || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "Validation Error", message: "A valid email address is required." },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length > 120) {
      return NextResponse.json(
        { error: "Validation Error", message: "Email must not exceed 120 characters." },
        { status: 400 }
      );
    }

    // Category validation
    const rawCategory = typeof category === "string" ? category.trim() : "Feedback";
    if (!ALLOWED_CATEGORIES.includes(rawCategory as FeedbackCategory)) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: `Invalid feedback category. Allowed: ${ALLOWED_CATEGORIES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const cleanCategory = rawCategory as FeedbackCategory;

    // Star rating validation (optional, but if provided must be integer 1..5)
    let cleanRating: number | null = null;
    if (rating !== undefined && rating !== null) {
      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return NextResponse.json(
          { error: "Validation Error", message: "Star rating must be an integer between 1 and 5." },
          { status: 400 }
        );
      }
      cleanRating = numRating;
    }

    // Message validation
    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Validation Error", message: "Feedback message is required." },
        { status: 400 }
      );
    }
    const cleanMessage = message.trim();
    if (cleanMessage.length < 10) {
      return NextResponse.json(
        { error: "Validation Error", message: "Message must be at least 10 characters long." },
        { status: 400 }
      );
    }
    if (cleanMessage.length > 5000) {
      return NextResponse.json(
        { error: "Validation Error", message: "Message must not exceed 5000 characters." },
        { status: 400 }
      );
    }

    // 5. Deduplication check
    if (isDuplicateSubmission(cleanEmail, cleanMessage)) {
      return NextResponse.json(
        {
          error: "Duplicate Submission",
          message: "You have already submitted this feedback. Please wait before submitting again.",
        },
        { status: 409 }
      );
    }

    // Generate unique verifiable Ticket ID
    const ticketId = `FB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const submittedAt = new Date().toISOString();

    const record = {
      ticketId,
      name: cleanName,
      email: cleanEmail,
      category: cleanCategory,
      rating: cleanRating,
      message: cleanMessage,
      utmData: typeof utmData === "object" && utmData !== null ? (utmData as Record<string, unknown>) : null,
      clientIp,
      submittedAt,
    };

    // 6. Database / Local Persistence (safely wrapped for serverless environments)
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, "feedback_submissions.jsonl");
      fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
    } catch (fsErr) {
      // In serverless environments (e.g. read-only Vercel functions), local file writes may be unsupported.
      // Log warning and continue to email dispatch so delivery is not blocked.
      console.warn("[Feedback] Local file storage bypassed (serverless environment):", fsErr);
    }

    // 7. Resend Email Delivery
    const { sendFeedbackEmailNotification } = await import("@/lib/email-service");
    const emailResult = await sendFeedbackEmailNotification(record);

    if (!emailResult.success) {
      console.error(`[Feedback] Resend delivery failed for ${ticketId}:`, emailResult.error);
      return NextResponse.json(
        {
          error: "Delivery Error",
          message: "We encountered an issue dispatching the feedback notification. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        ticketId,
        delivered: !emailResult.simulated,
        message: "Thank you! Your feedback has been received and forwarded to our team.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[Feedback API Internal Error]:", errorMsg);
    return NextResponse.json(
      { error: "Server Error", message: "Failed to process feedback submission." },
      { status: 500 }
    );
  }
}
