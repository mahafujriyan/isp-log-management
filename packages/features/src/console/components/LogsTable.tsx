import type { LogEntry } from "@isp/core/types";
import { protoTag } from "@isp/ui/Tag";

interface LogsTableProps {
  logs: LogEntry[];
  compact?: boolean;
}

const thClass =
  "sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-left shadow-[0_1px_0_#E2E8F0]";

export function LogsTable({ logs, compact = false }: LogsTableProps) {
  return (
    <div className="dashboard-scroll max-h-[420px] overflow-auto rounded-lg border border-[#E2E8F0]">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[12px]">
        <thead className="text-[11px] font-medium text-[#64748B]">
          <tr>
            <th className={thClass}>Time</th>
            <th className={thClass}>PPPoE User</th>
            <th className={thClass}>MAC</th>
            <th className={thClass}>User IP</th>
            {!compact && <th className={thClass}>Port</th>}
            <th className={thClass}>NAT IP</th>
            <th className={thClass}>Visited IP</th>
            <th className={thClass}>Port</th>
            {!compact && <th className={thClass}>Proto</th>}
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
