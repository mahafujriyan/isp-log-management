import type { ReactNode } from "react";

const styles: Record<string, string> = {
  https: "bg-[#E3F2FD] text-[#1565C0]",
  http: "bg-[#FFF8E1] text-[#E65100]",
  dns: "bg-[#F3E5F5] text-[#6A1B9A]",
  nat: "bg-[#E0F2F1] text-[#00695C]",
  acc: "bg-[#F3E5F5] text-[#6A1B9A]",
  ok: "bg-[#E8F5E9] text-[#2E7D32]",
  off: "bg-[#FFEBEE] text-[#C62828]",
  warn: "bg-[#FFF8E1] text-[#E65100]",
  inf: "bg-[#E3F2FD] text-[#1565C0]",
  sa: "bg-[#1F4E79] text-white",
  op: "bg-[#E3F2FD] text-[#1565C0]",
  vw: "bg-[#F1F5F9] text-[#64748B]",
};

export function Tag({
  variant,
  children,
}: {
  variant: keyof typeof styles;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[variant] ?? styles.vw}`}
    >
      {children}
    </span>
  );
}

export function protoTag(port: number) {
  if (port === 443) return <Tag variant="https">HTTPS</Tag>;
  if (port === 80 || port === 8080) return <Tag variant="http">HTTP</Tag>;
  if (port === 53) return <Tag variant="dns">DNS</Tag>;
  return <Tag variant="vw">{port}</Tag>;
}
