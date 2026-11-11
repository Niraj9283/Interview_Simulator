import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/auth/[...path]/route";

const originalBackend = process.env.AUTH_BACKEND_URL;
afterEach(() => {
  mock.restoreAll();
  if (originalBackend === undefined) delete process.env.AUTH_BACKEND_URL;
  else process.env.AUTH_BACKEND_URL = originalBackend;
});
function request(path: string, method = "POST", cookie?: string) {
  return new NextRequest(`https://app.example/api/auth/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    ...(method === "POST" ? { body: JSON.stringify({ email: "test@example.com", password: "test-password" }) } : {}),
  });
}
const context = (path: string) => ({ params: Promise.resolve({ path: [path] }) });

describe("Authentication proxy", () => {
  it("returns 401 immediately for anonymous session checks", async () => {
    const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Must not fetch"); });
    assert.equal((await GET(request("me", "GET"), context("me"))).status, 401);
    assert.equal(fetch.mock.callCount(), 0);
  });
  it("uses the backend binding and sets a cookie only after verified login", async () => {
    process.env.AUTH_BACKEND_URL = "https://backend.example/";
    mock.method(globalThis, "fetch", async (url: RequestInfo | URL, options: RequestInit = {}) => {
      assert.equal(String(url), "https://backend.example/api/auth/login");
      assert.ok(options.signal);
      assert.equal(options.cache, "no-store");
      return Response.json({ access_token: "verified-token", expires_in_hours: 24 });
    });
    const response = await POST(request("login"), context("login"));
    assert.equal(response.status, 200);
    assert.equal(response.cookies.get("mockmate_token")?.value, "verified-token");
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
  });
  it("never fabricates an account when the backend is unavailable", async () => {
    process.env.AUTH_BACKEND_URL = "https://backend.example";
    mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
    for (const path of ["login", "register", "delete-account", "reset-password"]) {
      const response = await POST(request(path), context(path));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("set-cookie"), null);
    }
  });
  it("returns a readable gateway timeout", async () => {
    process.env.AUTH_BACKEND_URL = "https://backend.example";
    mock.method(globalThis, "fetch", async () => { throw new DOMException("Timed out", "TimeoutError"); });
    const response = await POST(request("login"), context("login"));
    assert.equal(response.status, 504);
    assert.match((await response.json()).detail, /too long/);
  });
  it("prevents recursive calls to its own frontend route", async () => {
    process.env.AUTH_BACKEND_URL = "https://app.example";
    const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Must not fetch"); });
    assert.equal((await POST(request("login"), context("login"))).status, 503);
    assert.equal(fetch.mock.callCount(), 0);
  });
  it("forwards the session token and preserves backend rejections", async () => {
    process.env.AUTH_BACKEND_URL = "https://backend.example";
    mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, options: RequestInit = {}) => {
      assert.equal(new Headers(options.headers).get("Authorization"), "Bearer session-token");
      return Response.json({ detail: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
    });
    const response = await GET(request("me", "GET", "mockmate_token=session-token"), context("me"));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("set-cookie"), null);
  });
});
