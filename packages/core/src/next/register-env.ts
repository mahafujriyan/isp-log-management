import { loadMonorepoEnv, type MonorepoPortal } from "./load-monorepo-env";

/** Call from each app's instrumentation.ts on server boot. */
export function registerMonorepoEnv(portal: MonorepoPortal) {
  loadMonorepoEnv(process.cwd(), portal);
}
