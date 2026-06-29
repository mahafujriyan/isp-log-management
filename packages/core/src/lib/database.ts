import { Pool, QueryResult, QueryResultRow } from "pg";
import { DB_CONFIG, env } from "@isp/core/config";
import { resolvePgDatabaseUrl } from "@isp/core/lib/resolve-database-url";

export class Database {
  private pool: Pool;

  constructor() {
    const connectionString = resolvePgDatabaseUrl(env.database.url);
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    if (connectionString !== env.database.url && process.env.NODE_ENV !== "production") {
      console.warn(
        "[db] DATABASE_URL was a Prisma dev proxy URL — using TCP:",
        connectionString.replace(/:[^:@/]+@/, ":***@")
      );
    }

    this.pool = new Pool({
      connectionString,
      ...DB_CONFIG.pool,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(text, params);
      return result;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  async getOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] ?? null;
  }

  async getMany<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: Database | null = null;

function getDb(): Database {
  if (!dbInstance) dbInstance = new Database();
  return dbInstance;
}

/** Lazy DB singleton — waits until env is loaded (monorepo dev). */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop: keyof Database) {
    const instance = getDb();
    const value = instance[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
