#!/usr/bin/env node
/**
 * Check if all 3 dev portals are reachable.
 */
import http from "node:http";

const CHECKS = [
  { name: "Marketing", url: "http://127.0.0.1:3000/" },
  { name: "Super Admin", url: "http://127.0.0.1:3001/" },
  { name: "Operator", url: "http://127.0.0.1:3002/" },
];

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve({ ok: res.statusCode && res.statusCode < 500, status: res.statusCode });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

console.log("\nPortal health check:\n");
let allOk = true;

for (const { name, url } of CHECKS) {
  const result = await ping(url);
  if (result.ok) {
    console.log(`  ✓ ${name.padEnd(14)} ${url}  → HTTP ${result.status}`);
  } else {
    allOk = false;
    console.log(`  ✗ ${name.padEnd(14)} ${url}  → ${result.error ?? result.status}`);
  }
}

console.log(
  allOk
    ? "\n✓ সব portal চলছে! Browser এ উপরের URL গুলো open করুন.\n"
    : `
✗ কিছু portal চালু নেই।

Fix:
  1. npm run dev:stop
  2. npm run dev          ← terminal বন্ধ করবেন না!
  3. npm run dev:check    ← আবার check
  4. npm run dev:open     ← browser tab খুলবে

মনে রাখুন — ৩টা আলাদা port:
  http://localhost:3000
  http://localhost:3001/admin/login
  http://localhost:3002/auth/login
`
);

process.exit(allOk ? 0 : 1);
