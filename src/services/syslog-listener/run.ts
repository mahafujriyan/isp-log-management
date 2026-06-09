/**
 * Standalone MikroTik Syslog Listener + Socket.IO live stream.
 *
 * Usage:
 *   npx tsx src/services/syslog-listener/run.ts
 *
 * Env:
 *   DATABASE_URL, SYSLOG_UDP_PORT=514, SYSLOG_FILE=/var/log/mikrotik/isp-syslog.log
 *   SOCKET_PORT=3001, DEFAULT_TENANT_SCHEMA=tenant_001
 */

import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Server as SocketIOServer } from "socket.io";
import { receiveSyslogMessage } from "@/services/syslog-ingest.service";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SyslogServer = require("syslog-server");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../../..");

function loadEnvFile(filePath: string) {
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

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const UDP_PORT = Number(process.env.SYSLOG_UDP_PORT ?? 514);
const SOCKET_PORT = Number(process.env.SOCKET_PORT ?? 3001);
const SYSLOG_FILE = process.env.SYSLOG_FILE ?? "/var/log/mikrotik/isp-syslog.log";
const TAIL_FILE = process.env.SYSLOG_TAIL_FILE !== "false";

let processed = 0;
let errors = 0;

async function handleRawMessage(raw: string, routerIp?: string) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  try {
    const result = await receiveSyslogMessage({
      raw_message: trimmed,
      router_ip: routerIp,
      auto_register_router: true,
    });

    if (result.ok) {
      processed += 1;
      io?.emit("log:new", {
        ...result.parsed,
        schema_name: result.ingest?.schema_name,
        session_log_id: result.ingest?.session_log_id,
      });
      io?.emit("log:stats", { processed, errors, ts: new Date().toISOString() });
    } else {
      errors += 1;
      console.warn("[syslog] skipped:", result.error, trimmed.slice(0, 120));
    }
  } catch (err) {
    errors += 1;
    console.error("[syslog] ingest error:", err);
  }
}

const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", processed, errors, udp_port: UDP_PORT }));
});

const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL ?? "*", methods: ["GET"] },
  path: "/socket.io",
});

io.on("connection", (socket) => {
  socket.emit("log:stats", { processed, errors, ts: new Date().toISOString() });
  socket.on("subscribe", (payload: { tenant_id?: number }) => {
    if (payload?.tenant_id) {
      socket.join(`tenant:${payload.tenant_id}`);
    }
  });
});

function startUdpListener() {
  const server = new SyslogServer();

  server.on("message", (msg: { message: string; host?: string }) => {
    void handleRawMessage(msg.message, msg.host);
  });

  server.on("error", (err: Error & { code?: string }) => {
    if (err.code === "EACCES") {
      console.error(`Cannot bind UDP ${UDP_PORT} — use SYSLOG_UDP_PORT=5514 on Windows/local dev`);
    } else {
      console.error("[syslog] UDP error:", err);
    }
  });

  server.on("start", () => {
    console.log(`[syslog] UDP listener on 0.0.0.0:${UDP_PORT}`);
  });

  server.start({ port: UDP_PORT, address: "0.0.0.0" }).catch((err: Error) => {
    console.error("[syslog] UDP bind failed:", err.message);
    console.error("Tip: set SYSLOG_UDP_PORT=5514 in .env.local for local Windows dev");
  });
}

function tailLogFile() {
  if (!TAIL_FILE || !fs.existsSync(SYSLOG_FILE)) {
    if (TAIL_FILE) console.warn(`[syslog] tail disabled — file not found: ${SYSLOG_FILE}`);
    return;
  }

  let position = fs.statSync(SYSLOG_FILE).size;
  console.log(`[syslog] tailing ${SYSLOG_FILE}`);

  fs.watch(SYSLOG_FILE, () => {
    const stat = fs.statSync(SYSLOG_FILE);
    if (stat.size < position) position = 0;

    const stream = fs.createReadStream(SYSLOG_FILE, { start: position, end: stat.size });
    let buffer = "";

    stream.on("data", (chunk: string | Buffer) => {
      buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) void handleRawMessage(line);
      }
    });

    position = stat.size;
  });
}

httpServer.listen(SOCKET_PORT, () => {
  console.log(`[syslog] Socket.IO on :${SOCKET_PORT}`);
  startUdpListener();
  tailLogFile();
});

process.on("SIGINT", () => {
  console.log("\n[syslog] shutting down");
  process.exit(0);
});
