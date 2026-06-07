import type { LogEntry } from "@/lib/types";
import { protoTag } from "@/components/shared/Tag";

interface LogsTableProps {
  logs: LogEntry[];
  compact?: boolean;
}

export function LogsTable({ logs, compact = false }: LogsTableProps) {
  return (
    <div className="dashboard-scroll max-h-[260px] overflow-y-auto rounded-lg border border-[#E2E8F0]">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">Time</th>
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">PPPoE User</th>
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">MAC</th>
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">User IP</th>
            {!compact && (
              <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">Port</th>
            )}
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">NAT IP</th>
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">Visited IP</th>
            <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">Port</th>
            {!compact && (
              <th className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">Proto</th>
            )}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="hover:bg-[#F8FAFC]">
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.time}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.pppoe_user}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.mac}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.user_ip}</td>
              {!compact && (
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.nat_port}</td>
              )}
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.nat_ip}</td>
              <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{log.visited_ip}</td>
              <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{log.port}</td>
              {!compact && (
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  {protoTag(log.port)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
