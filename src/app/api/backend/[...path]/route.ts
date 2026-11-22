import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

async function proxyBackendRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const pathSegment = resolvedParams.path ? resolvedParams.path.join("/") : "";

  const requestHeaders = new Headers();
  const tokenCookie = req.cookies.get("mockmate_token");

  if (tokenCookie?.value) {
    requestHeaders.set("Authorization", `Bearer ${tokenCookie.value}`);
  }

  const contentType = req.headers.get("content-type");
  if (contentType) {
    requestHeaders.set("Content-Type", contentType);
  }

  const clientIp =
    req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  requestHeaders.set("X-Forwarded-For", clientIp);
  const requestId = req.headers.get("x-request-id") || `proxy_${Date.now()}`;
  requestHeaders.set("X-Request-ID", requestId);

  try {
    const backendUrl =
      process.env.AUTH_BACKEND_URL ||
      process.env.INTERNAL_API_URL ||
      (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8000" : undefined);

    if (!backendUrl) {
      throw new Error("Backend service is not configured");
    }

    const targetUrl = new URL(
      `${backendUrl.replace(/\/$/, "")}/${pathSegment}${req.nextUrl.search}`
    );

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? await req.blob() : undefined;

    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      // @ts-expect-error duplex required for streaming in Node fetch
      duplex: hasBody ? "half" : undefined,
    });

    const responseBlob = await backendResponse.blob();
    const headers = new Headers();
    backendResponse.headers.forEach((val, key) => {
      if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
        headers.set(key, val);
      }
    });

    return new NextResponse(responseBlob, {
      status: backendResponse.status,
      headers,
    });
  } catch (err: unknown) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        detail: timedOut
          ? "The service took too long to respond. Please try again shortly."
          : "The interview service is unavailable. Please try again shortly.",
      },
      { status: timedOut ? 504 : 503 }
    );
  }
}

export const GET = proxyBackendRequest;
export const POST = proxyBackendRequest;
export const PUT = proxyBackendRequest;
export const DELETE = proxyBackendRequest;
export const PATCH = proxyBackendRequest;
