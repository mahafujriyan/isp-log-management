/**
 * Cross-portal API base URL — marketing site calls operator API on another domain.
 */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_OPERATOR_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3002" : "")
  );
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
