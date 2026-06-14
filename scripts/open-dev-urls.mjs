#!/usr/bin/env node
import { execSync } from "node:child_process";

const URLS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

if (process.platform === "win32") {
  for (const url of URLS) {
    execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
  }
} else if (process.platform === "darwin") {
  for (const url of URLS) {
    execSync(`open "${url}"`, { stdio: "ignore" });
  }
} else {
  for (const url of URLS) {
    try {
      execSync(`xdg-open "${url}"`, { stdio: "ignore" });
    } catch {
      console.log(url);
    }
  }
}

console.log("✓ opened 3 portal tabs in browser");
