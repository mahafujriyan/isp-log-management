/** Resolve Prisma Postgres dev URLs to TCP `postgres://` for `pg`. */

function stripTerminalArtifacts(text) {
  let s = `${text ?? ""}`;
  // OSC 8 hyperlinks embed the real URL before BEL — keep it, drop terminal markup.
  s = s.replace(/\x1B\]8;;([^\x07]+)\x07/g, "$1 ");
  s = s.replace(/\x1B\[[0-9;]*m/g, "");
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return s;
}

export function sanitizePostgresUrl(url) {
  if (!url) return "";
  const cleaned = stripTerminalArtifacts(url).trim().replace(/^["']|["']$/g, "");
  const match = cleaned.match(/^postgres(?:ql)?:\/\/[^\s]+/i);
  return match?.[0] ?? cleaned.split(/\s/)[0] ?? "";
}

export function resolvePgDatabaseUrl(raw) {
  if (!raw?.trim()) return "";

  const trimmed = sanitizePostgresUrl(raw);

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

function decodePrismaApiKey(input) {
  try {
    const normalized = input.replace(/^prisma\+postgres:/i, "postgres:");
    const url = new URL(normalized);
    const apiKey = url.searchParams.get("api_key");
    if (!apiKey) return null;

    const json = JSON.parse(Buffer.from(apiKey, "base64url").toString("utf8"));
    return json.databaseUrl?.trim() || null;
  } catch {
    return null;
  }
}

/** Prefer TCP URL from `prisma dev ls` output (not prisma+postgres proxy). */
export function parseTcpUrlFromPrismaLs(output) {
  const text = stripTerminalArtifacts(output);

  const fromPrismaProxy = text.match(/prisma\+postgres:\/\/[^\s"']+/i)?.[0];
  const decoded = fromPrismaProxy ? resolvePgDatabaseUrl(fromPrismaProxy) : "";
  if (decoded.includes("@localhost:")) return sanitizePostgresUrl(decoded);

  const tcpBlock = text.split(/\bTCP\b/i)[1] ?? text;
  const match = tcpBlock.match(
    /postgres:\/\/postgres:[^@\s"']+@localhost:\d+\/[^\s"']+/i
  );
  return sanitizePostgresUrl(match?.[0]);
}
