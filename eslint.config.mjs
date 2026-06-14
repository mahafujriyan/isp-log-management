import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/.turbo/**",
    "**/node_modules/**",
    "next-env.d.ts",
    "apps/*/next-env.d.ts",
    // Legacy single-app folder (monorepo uses apps/ + packages/)
    "src/**",
  ]),
  {
    settings: {
      next: {
        rootDir: ["apps/marketing", "apps/super-admin", "apps/operator"],
      },
    },
    rules: {
      // React 19 compiler rules — too strict for standard data-fetch useEffect patterns
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
