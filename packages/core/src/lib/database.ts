import { Pool, QueryResult, QueryResultRow } from "pg";
import { DB_CONFIG, env } from "@isp/core/config";

export class Database {
  private pool: Pool;

  constructor() {
    const connectionString = env.database.url;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    this.pool = new Pool({
      connectionString,
      ...DB_CONFIG.pool,
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
