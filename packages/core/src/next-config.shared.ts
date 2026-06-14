import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

export function createAppConfig(appName: string): NextConfig {
  return {
    reactStrictMode: true,
    reactCompiler: true,
    compress: true,
    poweredByHeader: false,
    transpilePackages: ["@isp/core", "@isp/auth", "@isp/ui", "@isp/features"],
    env: {
      NEXT_PUBLIC_APP_NAME: appName,
    },
    headers: async () => [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ],
  };
}
