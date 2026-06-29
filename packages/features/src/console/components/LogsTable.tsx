"use client";

import type { LogEntry } from "@isp/core/types";
import { formatIspLogLine } from "@isp/core/utils/mikrotik-parser.utils";
import { Tag } from "@isp/ui/Tag";

interface LogsTableProps {
  logs: LogEntry[];
  compact?: boolean;
}

const thClass =
  "sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-left shadow-[0_1px_0_#E2E8F0]";

function protocolLabel(protocol?: string, port?: number) {
  if (protocol) return <Tag variant="vw">{protocol}</Tag>;
  if (port === 443) return <Tag variant="https">HTTPS</Tag>;
  if (port === 80) return <Tag variant="http">HTTP</Tag>;
  if (port === 53) return <Tag variant="dns">DNS</Tag>;
  return <Tag variant="vw">—</Tag>;
}

export function LogsTable({ logs, compact = false }: LogsTableProps) {
  return (
    <div className="dashboard-scroll max-h-[480px] overflow-auto rounded-lg border border-[#E2E8F0]">
      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[12px]">
        <thead className="text-[11px] font-medium text-[#64748B]">
          <tr>
            <th className={thClass}>Time</th>
            {!compact && <th className={thClass}>MikroTik Log (ISP format)</th>}
            <th className={thClass}>PPPoE User</th>
            <th className={thClass}>MAC</th>
            <th className={thClass}>User IP</th>
            <th className={thClass}>Src Port</th>
            <th className={thClass}>NAT IP</th>
            <th className={thClass}>Visited IP</th>
            <th className={thClass}>Dst Port</th>
            <th className={thClass}>Proto</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={log.id ?? i} className="hover:bg-[#F8FAFC]">
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 whitespace-nowrap">
                {log.time}
              </td>
              {!compact && (
                <td className="mono max-w-[360px] border-b border-[#E2E8F0] px-2.5 py-1.5 text-[11px] text-[#334155]">
                  {formatIspLogLine(log)}
                </td>
              )}
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.pppoe_user}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.mac}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.user_ip}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.user_port ?? "—"}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.nat_ip}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.visited_ip}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.port}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                {protocolLabel(log.protocol, log.port)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
