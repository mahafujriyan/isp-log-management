#!/usr/bin/env node
/**
 * Free dev ports before starting Next.js apps (fixes EADDRINUSE).
 */
import { execSync } from "node:child_process";

const PORTS = [3000, 3001, 3002];

function killPort(port) {
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"`,
        { stdio: "ignore" }
      );
    } catch {
      // port already free
    }
    return;
  }

  try {
    execSync(`lsof -ti:${port} | xargs -r kill -9 2>/dev/null || true`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // port already free
  }
}

for (const port of PORTS) {
  killPort(port);
}

console.log(`✓ ports ${PORTS.join(", ")} cleared`);
