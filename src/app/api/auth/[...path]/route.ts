import { NextRequest, NextResponse } from "next/server";

// Keep the upstream deadline shorter than the browser deadline.
export const maxDuration = 30;

async function proxyAuthRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const pathSegment = resolvedParams.path ? resolvedParams.path.join("/") : "";


  const requestHeaders = new Headers();
  const tokenCookie = req.cookies.get("mockmate_token");

  // Anonymous visitors do not need a backend round trip.
  if (pathSegment === "me" && req.method === "GET" && !tokenCookie?.value) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

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
    // Vercel injects this binding at runtime; never call the public frontend
    // origin as the backend, which would recurse through this same route.
    const backendUrl = process.env.AUTH_BACKEND_URL || process.env.INTERNAL_API_URL ||
      (process.env.NODE_ENV !== "production" ? "http://localhost:8000" : undefined);
    if (!backendUrl) throw new Error("Authentication backend is not configured");
    const backendTarget = new URL(`${backendUrl.replace(/\/$/, "")}/api/auth/${pathSegment}`);
    if (backendTarget.origin === req.nextUrl.origin && backendTarget.pathname === req.nextUrl.pathname) {
      throw new Error("Authentication backend points to the frontend");
    }
    const backendResponse = await fetch(backendTarget, {
      method: req.method,
      headers: requestHeaders,
      body: bodyContent,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });

    const isJson = backendResponse.headers.get("content-type")?.includes("application/json");
    let responseData: Record<string, unknown> | string;
    if (isJson) {
      try {
        responseData = await backendResponse.json();
      } catch (error) {
        if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw error;
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
          "Cache-Control": "no-store",
          ...(backendResponse.headers.has("retry-after") ? { "Retry-After": backendResponse.headers.get("retry-after")! } : {}),
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
    if (backendResponse.ok && (pathSegment === "logout" || pathSegment === "delete-account")) {
      clientResponse.cookies.delete("mockmate_token");
    }

    return clientResponse;
  } catch (err: unknown) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.warn(`[Auth Proxy] ${requestId}: ${timedOut ? "upstream timeout" : "upstream unavailable"}`);
    return NextResponse.json(
      { detail: timedOut
        ? "The authentication service took too long to respond. Please try again shortly."
        : "The authentication service is unavailable. Please try again shortly." },
      { status: timedOut ? 504 : 503, headers: { "X-Request-ID": requestId, "Cache-Control": "no-store" } }
    );
  }
}

export const GET = proxyAuthRequest;
export const POST = proxyAuthRequest;
export const PUT = proxyAuthRequest;
export const DELETE = proxyAuthRequest;
