/**
 * Resolve Prisma Postgres dev URLs to a standard `postgres://` TCP URL for `pg`.
 * Prisma CLI exposes `prisma+postgres://localhost:51213/?api_key=...` — `pg` cannot use that.
 */

function stripTerminalArtifacts(text: string): string {
  let s = text;
  s = s.replace(/\x1B\]8;;([^\x07]+)\x07/g, "$1 ");
  s = s.replace(/\x1B\[[0-9;]*m/g, "");
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s;
}

export function sanitizePostgresUrl(url: string | undefined): string {
  if (!url) return "";
  const cleaned = stripTerminalArtifacts(url).trim().replace(/^["']|["']$/g, "");
  const match = cleaned.match(/^postgres(?:ql)?:\/\/[^\s]+/i);
  return match?.[0] ?? cleaned.split(/\s/)[0] ?? "";
}

export function resolvePgDatabaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) return "";

  const trimmed = sanitizePostgresUrl(raw);

  // Direct postgres URL with credentials — already usable by `pg`.
  if (
    /^postgres(?:ql)?:\/\/[^/]+@/i.test(trimmed) &&
    !trimmed.includes("api_key=")
  ) {
    return trimmed;
  }

  const fromApiKey = decodePrismaApiKey(trimmed);
  if (fromApiKey) return sanitizePostgresUrl(fromApiKey);

  return trimmed;
}

function decodePrismaApiKey(input: string): string | null {
  try {
    const normalized = input.replace(/^prisma\+postgres:/i, "postgres:");
    const url = new URL(normalized);
    const apiKey = url.searchParams.get("api_key");
    if (!apiKey) return null;

    const json = JSON.parse(
      Buffer.from(apiKey, "base64url").toString("utf8")
    ) as { databaseUrl?: string };

    return json.databaseUrl?.trim() || null;
  } catch {
    return null;
  }
}
