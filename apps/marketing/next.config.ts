import type { NextConfig } from "next";
import path from "path";
import { loadMonorepoEnv } from "@isp/core/next/load-monorepo-env";

const portalEnv = loadMonorepoEnv(__dirname, "marketing");

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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["@isp/core", "@isp/auth", "@isp/ui", "@isp/features"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  env: portalEnv,
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
};

export default nextConfig;
