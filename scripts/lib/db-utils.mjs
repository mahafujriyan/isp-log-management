import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.join(__dirname, "../..");

export function loadEnvFiles() {
  for (const file of [".env.production.local", ".env.local", ".env"]) {
    loadEnvFile(path.join(repoRoot, file));
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

export function getDatabaseUrl() {
  loadEnvFiles();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (.env.production.local)");
    process.exit(1);
  }
  return url;
}

export function createPgClient(url = getDatabaseUrl()) {
  return new pg.Client({
    connectionString: url,
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
}

export async function runSqlFile(relativePath, label) {
  const sqlPath = path.join(repoRoot, "scripts", relativePath);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = createPgClient();
  try {
    await client.connect();
    await client.query(sql);
    console.log(`✓ ${label}`);
  } catch (err) {
    console.error(`✗ ${label}:`, err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
