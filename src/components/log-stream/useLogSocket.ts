"use client";

import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@/types";

interface SocketLogPayload {
  timestamp: string;
  pppoe_user: string;
  mac_address: string;
  user_ip: string;
  user_port: number | null;
  nat_ip: string;
  nat_port: number | null;
  visited_ip: string;
  visited_port: number | null;
  protocol: string;
  schema_name?: string;
}

function payloadToLogEntry(p: SocketLogPayload): LogEntry {
  return {
    time: p.timestamp,
    pppoe_user: p.pppoe_user ?? "",
    mac: p.mac_address ?? "",
    user_ip: p.user_ip ?? "",
    nat_ip: p.nat_ip ?? "",
    visited_ip: p.visited_ip ?? "",
    port: p.visited_port ?? 0,
    nat_port: p.nat_port ?? undefined,
    protocol: p.protocol,
  };
}

export function useLogSocket(tenantId: number, onLog?: (entry: LogEntry) => void) {
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<{ processed: number; errors: number } | null>(null);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ??
      (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:3001` : "");

    if (!socketUrl) return;

    let active = true;

    import("socket.io-client").then(({ io }) => {
      if (!active) return;

      const socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("subscribe", { tenant_id: tenantId });
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("log:new", (payload: SocketLogPayload) => {
        onLog?.(payloadToLogEntry(payload));
      });

      socket.on("log:stats", (s: { processed: number; errors: number }) => {
        setStats(s);
      });
    });

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [tenantId, onLog]);

  return { connected, stats };
}
