import type { BtrcConfig } from "@isp/core/types/btrc.types";
import { env } from "@isp/core/config/env.config";
import { APP_CONFIG } from "@isp/core/config/app.config";

export const BTRC_CONFIG = {
  regulator: "BTRC",
  country: "BD",
  payloadVersion: "1.0",
  minRetentionDays: 180,
  csvHeaders: [
    "ISP_LICENSE",
    "ISP_NAME",
    "LOG_DATETIME",
    "SUBSCRIBER_ID",
    "MAC_ADDRESS",
    "PRIVATE_IP",
    "PUBLIC_IP",
    "PUBLIC_PORT",
    "DEST_IP",
    "DEST_PORT",
    "PROTOCOL",
    "SESSION_ID",
  ] as const,
  batchIdPrefix: "BTRC",
} as const;

export function getDefaultBtrcConfig(): BtrcConfig {
  return {
    isp_license: env.btrc.ispLicense,
    isp_name: env.btrc.ispName || APP_CONFIG.company.name,
    api_url: env.btrc.apiUrl,
    auto_submit: env.btrc.autoSubmit,
    submit_interval_hours: env.btrc.submitIntervalHours,
    retention_days: env.btrc.retentionDays,
    timezone: APP_CONFIG.timezone,
    contact_email: env.btrc.contactEmail || APP_CONFIG.company.email,
  };
}
