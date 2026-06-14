import { BTRC_CONFIG } from "@isp/core/config/btrc.config";

export async function hashPayload(data: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(data).digest("hex");
}

export function generateBatchId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${BTRC_CONFIG.batchIdPrefix}-${ts}-${rand}`;
}

export function escapeCsvValue(value: unknown): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}
