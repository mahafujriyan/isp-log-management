"use client";

import { useCallback, useEffect, useState } from "react";
import type { Device } from "@isp/core/types";
import { useTenantContext } from "@isp/auth/hooks/useTenantContext";
import { Tag } from "@isp/ui/Tag";
import { Loader2, RefreshCw } from "lucide-react";

export function DisabledDevicesPanel() {
  const { tenantId } = useTenantContext();
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDevices, setActiveDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [disabledRes, activeRes] = await Promise.all([
        fetch(`/api/devices?tenant_id=${tenantId}&disabled=true`),
        fetch(`/api/devices?tenant_id=${tenantId}`),
      ]);
      const disabledData = await disabledRes.json();
      const activeData = await activeRes.json();
      setDevices(disabledData.devices ?? []);
      setActiveDevices(activeData.devices ?? []);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function recheck() {
    setChecking(true);
    try {
      await fetch("/api/devices/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      await load();
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
        <Loader2 className="animate-spin text-[#1565C0]" size={24} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#64748B]">
          <div className="font-medium text-[#1E293B]">No disabled devices</div>
          <div className="text-center text-[12px]">
            Devices that stop sending logs for more than 30 minutes will appear here automatically.
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {activeDevices.map((d) => (
              <span key={d.id} className="inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[11px]">
                {d.name} — <span className="font-medium text-[#2E7D32]">Active</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-scroll overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
                {["Device", "IP", "NAT IP", "Status", "Last seen"].map((h) => (
                  <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-[#F8FAFC]">
                  <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 font-medium">{d.name}</td>
                  <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.ip}</td>
                  <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.nat_ip}</td>
                  <td className="border-b border-[#E2E8F0] px-2.5 py-1.5"><Tag variant="off">Disabled</Tag></td>
                  <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-[#64748B]">No recent syslog</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={recheck}
        disabled={checking}
        className="mt-4 flex items-center gap-1 rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px] hover:bg-[#F8FAFC] disabled:opacity-60"
      >
        {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        Re-check device status
      </button>
    </div>
  );
}
