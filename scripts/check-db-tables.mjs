import pg from "pg";
import fs from "fs";

const url = fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1];
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1"
);
console.log(r.rows.length ? r.rows.map((x) => x.table_name).join(", ") : "(no tables yet)");
await c.end();
