/** Returns a user-facing API error if PostgreSQL relation is missing (42P01). */
export function mapDatabaseError(error: unknown, hint = "npm run db:setup") {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("does not exist") || message.includes("42P01")) {
    return {
      status: 503,
      body: {
        error: "Database schema not initialized",
        detail: message,
        fix: `Run: ${hint}`,
      },
    };
  }
  return {
    status: 500,
    body: {
      error: "Database error",
      detail: message,
    },
  };
}
