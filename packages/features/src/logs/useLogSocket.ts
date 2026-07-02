"use client";

import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@isp/core/types";
import { formatIspLogLine } from "@isp/core/utils/mikrotik-parser.utils";

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
  raw_message?: string;
  schema_name?: string;
  router_name?: string | null;
  session_status?: string | null;
  session_last_seen?: string | null;
}

const isIpLike = (value?: string | null): boolean =>
  !!value?.trim() && /^\d{1,3}(\.\d{1,3}){3}$/.test(value.trim());

function payloadToLogEntry(p: SocketLogPayload): LogEntry {
  const user = p.pppoe_user?.trim();
  const entry: LogEntry = {
    time: p.timestamp,
    pppoe_user: user && !isIpLike(user) ? user : "",
    mac: p.mac_address ?? "",
    user_ip: p.user_ip ?? "",
    user_port: p.user_port ?? undefined,
    nat_ip: p.nat_ip ?? "",
    visited_ip: p.visited_ip ?? "",
    port: p.visited_port ?? 0,
    nat_port: p.nat_port ?? undefined,
    protocol: p.protocol,
    raw_message: p.raw_message,
    router_name: p.router_name ?? null,
    session_status: p.session_status ?? null,
    session_last_seen: p.session_last_seen ?? null,
  };
  if (!entry.raw_message) entry.raw_message = formatIspLogLine(entry);
  return entry;
}

function resolveSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit && explicit !== "same-origin") return explicit;
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  // Direct operator :3002 — Socket.IO worker runs on :3003
  if (port === "3002") return `${protocol}//${hostname}:3003`;
  return window.location.origin;
}

export function useLogSocket(tenantId: number | undefined, onLog?: (entry: LogEntry) => void) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ processed: number; errors: number } | null>(null);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const onLogRef = useRef(onLog);

  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    if (tenantId == null) {
      setConnected(false);
      setError(null);
      return;
    }

    const socketUrl = resolveSocketUrl();

    if (!socketUrl) {
      setError("Socket URL not configured");
      return;
    }

    let active = true;

    import("socket.io-client").then(({ io }) => {
      if (!active) return;

      const socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        setError(null);
        socket.emit("subscribe", { tenant_id: tenantId });
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("connect_error", (err: Error) => {
        setConnected(false);
        setError(err.message || "Socket server unreachable");
      });

      socket.on("log:new", (payload: SocketLogPayload) => {
        onLogRef.current?.(payloadToLogEntry(payload));
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
  }, [tenantId]);

  return { connected, stats, error };
}
