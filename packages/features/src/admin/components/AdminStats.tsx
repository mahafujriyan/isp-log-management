"use client";

import type { Tenant } from "@isp/core/types";
import { AlertTriangle, Building2, CheckCircle2, Users } from "lucide-react";

interface AdminStatsProps {
  tenants: Tenant[];
  userCount?: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <Icon size={20} className={`mb-3 ${accent}`} />
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export function AdminStats({ tenants, userCount }: AdminStatsProps) {
  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Tenants"
        value={tenants.length}
        icon={Building2}
        accent="text-amber-400"
      />
      <StatCard
        label="Active"
        value={active}
        icon={CheckCircle2}
        accent="text-green-400"
      />
      <StatCard
        label="Suspended"
        value={suspended}
        icon={AlertTriangle}
        accent="text-red-400"
      />
      <StatCard
        label="Platform Users"
        value={userCount ?? "—"}
        icon={Users}
        accent="text-blue-400"
      />
    </div>
  );
}
