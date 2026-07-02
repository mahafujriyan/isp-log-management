"use client";

import type { LogEntry } from "@isp/core/types";
import { formatDisplayMac, formatDisplayUser, formatLogTime } from "@isp/core/utils/log-display.utils";
import { Tag } from "@isp/ui/Tag";

interface LogsTableProps {
  logs: LogEntry[];
  compact?: boolean;
}

const thClass =
  "sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-left text-[11px] font-semibold text-[#475569] shadow-[0_1px_0_#E2E8F0]";

function protocolLabel(protocol?: string, port?: number) {
  if (protocol) return <Tag variant="vw">{protocol}</Tag>;
  if (port === 443) return <Tag variant="https">HTTPS</Tag>;
  if (port === 80) return <Tag variant="http">HTTP</Tag>;
  if (port === 53) return <Tag variant="dns">DNS</Tag>;
  return <Tag variant="vw">—</Tag>;
}

export function LogsTable({ logs, compact = false }: LogsTableProps) {
  return (
    <div className="dashboard-scroll max-h-[520px] overflow-auto rounded-lg border border-[#E2E8F0]">
      <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[12px]">
        <thead>
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Time</th>
            <th className={thClass}>PPPoE / User</th>
            <th className={thClass}>MAC address</th>
            <th className={thClass}>Private IP</th>
            <th className={thClass}>Src port</th>
            <th className={thClass}>Public NAT IP</th>
            <th className={thClass}>Destination</th>
            <th className={thClass}>Dst port</th>
            <th className={thClass}>Proto</th>
            <th className={thClass}>Router</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const user = formatDisplayUser(log);
            const mac = formatDisplayMac(log.mac);
            return (
              <tr
                key={log.id ?? `${log.time}-${i}`}
                className={i % 2 === 0 ? "bg-white hover:bg-[#F8FAFC]" : "bg-[#FAFBFC] hover:bg-[#F1F5F9]"}
              >
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-[11px] text-[#94A3B8]">{i + 1}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 whitespace-nowrap text-[11px] text-[#334155]">
                  {formatLogTime(log.time)}
                </td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 font-medium text-[#0F172A]">
                  {user}
                </td>
                <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5 text-[11px] tracking-wide text-[#1565C0]">
                  {mac}
                </td>
                <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.user_ip || "—"}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center">{log.user_port ?? "—"}</td>
                <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.nat_ip || "—"}</td>
                <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.visited_ip || "—"}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center">{log.port || "—"}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  {protocolLabel(log.protocol, log.port)}
                </td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 whitespace-nowrap text-[11px] text-[#475569]">
                  {log.router_name || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
