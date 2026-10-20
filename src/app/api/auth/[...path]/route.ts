import { NextRequest, NextResponse } from "next/server";

// Backend API URL (server-to-server)
const BACKEND_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function proxyAuthRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegment = resolvedParams.path ? resolvedParams.path.join("/") : "";
  const backendTarget = `${BACKEND_URL}/api/auth/${pathSegment}`;

  const requestHeaders = new Headers();
  const tokenCookie = req.cookies.get("mockmate_token");

  // Forward authorization header if cookie is present
  if (tokenCookie?.value) {
    requestHeaders.set("Authorization", `Bearer ${tokenCookie.value}`);
  }

  // Preserve Content-Type if present
  const contentType = req.headers.get("content-type");
  if (contentType) {
    requestHeaders.set("Content-Type", contentType);
  }

  // Forward client IP and correlation ID
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  requestHeaders.set("X-Forwarded-For", clientIp);
  const requestId = req.headers.get("x-request-id") || `auth_${Date.now()}`;
  requestHeaders.set("X-Request-ID", requestId);

  // Read request body for state-changing methods
  let bodyContent: string | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      bodyContent = await req.text();
    } catch {
      bodyContent = undefined;
    }
  }

  try {
    const backendResponse = await fetch(backendTarget, {
      method: req.method,
      headers: requestHeaders,
      body: bodyContent,
    });

    const isJson = backendResponse.headers.get("content-type")?.includes("application/json");
    let responseData: Record<string, unknown> | string;
    if (isJson) {
      try {
        responseData = await backendResponse.json();
      } catch {
        responseData = {};
      }
    } else {
      responseData = await backendResponse.text();
    }

    // Build Next.js response
    const clientResponse = NextResponse.json(
      responseData,
      {
        status: backendResponse.status,
        headers: {
          "X-Request-ID": requestId,
        },
      }
    );

    const isProduction = process.env.NODE_ENV === "production";

    // 1. If login or register succeeded with access_token, set HttpOnly cookie
    if (backendResponse.ok && typeof responseData === "object" && responseData !== null && "access_token" in responseData) {
      const token = responseData.access_token as string;
      const maxAgeHours = (responseData.expires_in_hours as number) || 168;
      const expiresDate = new Date(Date.now() + maxAgeHours * 3600 * 1000);
      clientResponse.cookies.set({
        name: "mockmate_token",
        value: token,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: maxAgeHours * 3600,
        expires: expiresDate,
      });
    }

    // 2. If logout or delete-account succeeded, clear HttpOnly cookie
    if (pathSegment === "logout" || pathSegment === "delete-account") {
      clientResponse.cookies.delete("mockmate_token");
    }

    return clientResponse;
  } catch (err: unknown) {
    console.error(`[Auth Proxy Error at /api/auth/${pathSegment}]:`, err);
    return NextResponse.json(
      {
        error: "Backend Service Unavailable",
        message: "Unable to communicate with the authentication service. Please ensure the backend server is running.",
      },
      { status: 503 }
    );
  }
}

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
