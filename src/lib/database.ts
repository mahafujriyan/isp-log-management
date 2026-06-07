import { Pool, QueryResult, QueryResultRow } from "pg";
import { DB_CONFIG, env } from "@/config";

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: env.database.url,
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
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      if (env.isDev) {
        console.log("Executed query", { text, duration: Date.now() - start, rows: result.rowCount });
      }
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

export const db = new Database();
