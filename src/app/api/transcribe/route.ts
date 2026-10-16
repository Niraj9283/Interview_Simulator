import { NextRequest, NextResponse } from "next/server";

// Rate limiting map: IP -> timestamp array
const ipRequests = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 20;
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequests.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }

  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Client IP Identification & Rate Limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown_client";

    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please wait a minute before sending more audio chunks.",
        },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // 2. Parse Multipart Body
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 3. Payload Size Guard
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "Payload Too Large",
          message: `Audio file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted 25MB limit.`,
        },
        { status: 413 }
      );
    }

    // 4. Secure Server-side API Key handling (Never returned to client)
    const apiKey = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY;

    if (apiKey) {
      const openAiFormData = new FormData();
      openAiFormData.append("file", file, "audio.webm");
      openAiFormData.append("model", "whisper-1");
      openAiFormData.append("response_format", "verbose_json");
      openAiFormData.append("timestamp_granularities[]", "word");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: openAiFormData,
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          text: data.text,
          words: data.words || [],
          duration: data.duration,
        });
      }
    }

    // Fallback response for offline or client-side speech recognition
    return NextResponse.json({
      text: "",
      words: [],
      message: "Browser speech recognition or client fallback active.",
    });
  } catch (err: unknown) {
    console.error("Secure transcription error:", err);
    return NextResponse.json(
      { error: "Transcription service unavailable or request malformed." },
      { status: 500 }
    );
  }
}
