"use client";

import { useCallback, useState } from "react";

export interface HealthStatus {
  status: "ok" | "error" | "idle" | "loading";
  database?: string;
  timestamp?: string;
  message?: string;
  error?: string;
}

export function useHealthCheck() {
  const [health, setHealth] = useState<HealthStatus>({ status: "idle" });
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    setHealth({ status: "loading" });
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth({
        status: data.status === "ok" ? "ok" : "error",
        database: data.database,
        timestamp: data.timestamp,
        message: data.message,
        error: data.error,
      });
      return data;
    } catch {
      setHealth({ status: "error", error: "Failed to reach /api/health" });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { health, loading, check };
}
