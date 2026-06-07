import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "amber" | "teal" | "red" | "purple";
  icon?: LucideIcon;
  trend?: string;
}

const colorMap = {
  blue: {
    text: "text-[#1565C0]",
    bg: "from-[#E3F2FD] to-[#BBDEFB]",
    ring: "ring-[#90CAF9]/40",
    icon: "text-[#1565C0]",
  },
  green: {
    text: "text-[#2E7D32]",
    bg: "from-[#E8F5E9] to-[#C8E6C9]",
    ring: "ring-[#A5D6A7]/40",
    icon: "text-[#2E7D32]",
  },
  amber: {
    text: "text-[#E65100]",
    bg: "from-[#FFF8E1] to-[#FFECB3]",
    ring: "ring-[#FFE082]/40",
    icon: "text-[#E65100]",
  },
  teal: {
    text: "text-[#00695C]",
    bg: "from-[#E0F2F1] to-[#B2DFDB]",
    ring: "ring-[#80CBC4]/40",
    icon: "text-[#00695C]",
  },
  red: {
    text: "text-[#C62828]",
    bg: "from-[#FFEBEE] to-[#FFCDD2]",
    ring: "ring-[#EF9A9A]/40",
    icon: "text-[#C62828]",
  },
  purple: {
    text: "text-[#6A1B9A]",
    bg: "from-[#F3E5F5] to-[#E1BEE7]",
    ring: "ring-[#CE93D8]/40",
    icon: "text-[#6A1B9A]",
  },
};

export function MetricCard({
  label,
  value,
  sub,
  color = "blue",
  icon: Icon,
  trend,
}: MetricCardProps) {
  const c = colorMap[color];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 shadow-sm shadow-slate-200/40 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/60">
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition group-hover:opacity-60" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
            {label}
          </div>
          <div className={`text-[26px] font-semibold tabular-nums tracking-tight ${c.text}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {sub && <div className="mt-0.5 text-[11px] text-[#64748B]">{sub}</div>}
          {trend && (
            <div className="mt-1.5 text-[10px] font-medium text-[#2E7D32]">{trend}</div>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.bg} ring-1 ${c.ring}`}
          >
            <Icon size={18} className={c.icon} strokeWidth={2.2} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 shadow-sm shadow-slate-200/40">
      <div className="mb-3 text-[12px] font-semibold text-[#475569]">{title}</div>
      <div className="relative h-[148px]">{children}</div>
    </div>
  );
}

export function PanelCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 shadow-sm shadow-slate-200/40 ${className}`}
    >
      <div className="mb-3 text-[12px] font-semibold text-[#475569]">{title}</div>
      {children}
    </div>
  );
}
