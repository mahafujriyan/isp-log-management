/**
 * Load env for PM2 — reads .env.production.local → .env.local → .env
 */
const fs = require("fs");
const path = require("path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
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
    out[key] = val;
  }
  return out;
}

function loadProductionEnv() {
  const root = path.join(__dirname, "..");
  const files = [".env.production.local", ".env.local", ".env"];
  let merged = { NODE_ENV: "production" };
  for (const file of files) {
    merged = { ...merged, ...parseEnvFile(path.join(root, file)) };
  }
  return merged;
}

module.exports = loadProductionEnv;
