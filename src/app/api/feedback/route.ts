import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Rate limiting map: IP -> timestamp array
const ipRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_FEEDBACK_PER_MINUTE = 5;

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

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit reached. Please wait a minute before submitting additional feedback.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, category, message, utmData } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    const ticketId = `FB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const record = {
      ticketId,
      name: name.slice(0, 100).trim(),
      email: email.slice(0, 120).trim(),
      category: typeof category === "string" ? category : "General",
      message: message.slice(0, 5000).trim(),
      utmData: utmData ?? null,
      clientIp,
      submittedAt: new Date().toISOString(),
    };

    // Ensure data directory exists and append record
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, "feedback_submissions.jsonl");
    fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Feedback and telemetry recorded successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Feedback submission error:", errorMsg);
    return NextResponse.json({ error: "Failed to process feedback submission" }, { status: 500 });
  }
}
