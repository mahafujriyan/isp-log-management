import { createHash } from "crypto";

/**
 * Best-effort client IP extraction from proxy headers. Works behind nginx /
 * Vercel / Cloudflare. Falls back to "unknown" so callers always get a string.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-client-ip") ??
    "unknown"
  );
}

/**
 * Stable, server-derived device fingerprint. Prefers an explicit `x-device-id`
 * header / `dev_id` cookie when the client sends one, otherwise hashes the IP +
 * user-agent + accept-language. No data is stored client-side beyond the cookie
 * the browser already sends; the fingerprint itself is computed server-side.
 */
export function getDeviceId(request: Request): string {
  const explicit = request.headers.get("x-device-id");
  if (explicit && explicit.length >= 8) return explicit.slice(0, 64);

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)dev_id=([^;]+)/);
  if (match?.[1] && match[1].length >= 8) return decodeURIComponent(match[1]).slice(0, 64);

  const ua = request.headers.get("user-agent") ?? "";
  const lang = request.headers.get("accept-language") ?? "";
  const ip = getClientIp(request);
  return createHash("sha256").update(`${ip}|${ua}|${lang}`).digest("hex").slice(0, 32);
}
