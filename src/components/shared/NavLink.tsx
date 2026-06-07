"use client";

import Link from "next/link";

interface NavLinkProps {
  label: string;
  icon: React.ReactNode;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function NavLink({ label, icon, href, active = false, onClick, badge }: NavLinkProps) {
  const className = `group mx-2 flex w-[calc(100%-16px)] items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all ${
    active
      ? "bg-gradient-to-r from-[#1565C0] to-[#1976D2] font-medium text-white shadow-md shadow-blue-600/25"
      : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
  }`;

  const content = (
    <>
      <span className={`${active ? "text-white" : "text-[#94A3B8] group-hover:text-[#1565C0]"}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
            active ? "bg-white/20 text-white" : "bg-[#E3F2FD] text-[#1565C0]"
          }`}
        >
          {badge > 999 ? "999+" : badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
