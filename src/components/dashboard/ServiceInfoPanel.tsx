"use client";

import { useEffect, useState } from "react";
import { Tag } from "@/components/shared/Tag";
import { Loader2 } from "lucide-react";

interface ServiceRow {
  name: string;
  detail: string;
  status: string;
}

export function ServiceInfoPanel() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [info, setInfo] = useState({
    postgresVersion: "",
    nodeVersion: "",
    platform: "",
    serverTime: "",
    totalLogs: 0,
    activeUsers: 0,
    devices: 0,
    source: "",
  });

  useEffect(() => {
    fetch("/api/system/info")
      .then((r) => r.json())
      .then((data) => {
        if (data.services) setServices(data.services);
        setInfo({
          postgresVersion: data.postgresVersion ?? "unknown",
          nodeVersion: data.nodeVersion ?? "",
          platform: data.platform ?? "",
          serverTime: data.serverTime ?? "",
          totalLogs: data.metrics?.totalLogs ?? 0,
          activeUsers: data.metrics?.activeUsers ?? 0,
          devices: data.metrics?.devices ?? 0,
          source: data.metrics?.source ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
        <Loader2 className="animate-spin text-[#1565C0]" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Core services</div>
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between border-b border-[#E2E8F0] py-2 last:border-0">
              <div>
                <div className="text-[13px] font-medium">{s.name}</div>
                <div className="text-[11px] text-[#94A3B8]">{s.detail}</div>
              </div>
              <Tag variant={s.status === "running" ? "ok" : "off"}>{s.status === "running" ? "Running" : "Down"}</Tag>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Live metrics</div>
          {[
            { label: "Logs today", value: info.totalLogs, source: info.source },
            { label: "Active PPPoE users", value: info.activeUsers },
            { label: "Active devices", value: info.devices },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-[#E2E8F0] py-2 last:border-0">
              <span className="text-[13px]">{item.label}</span>
              <span className="text-[15px] font-semibold text-[#1565C0]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Platform", value: info.platform },
          { label: "Server time", value: info.serverTime ? new Date(info.serverTime).toLocaleString() : "—" },
          { label: "PostgreSQL", value: info.postgresVersion },
          { label: "Node.js", value: info.nodeVersion },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-[#F8FAFC] px-3.5 py-3">
            <div className="text-[11px] text-[#64748B]">{item.label}</div>
            <div className="text-[13px] font-medium text-[#1E293B]">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
