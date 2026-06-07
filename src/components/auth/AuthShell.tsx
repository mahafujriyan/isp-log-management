"use client";

import Link from "next/link";
import { Shield, ShieldCheck, Wifi } from "lucide-react";

interface AuthShellProps {
  variant: "user" | "super_admin";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  variant,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  const isSuper = variant === "super_admin";

  return (
    <div
      className={`relative flex min-h-screen ${
        isSuper
          ? "bg-[#0B1220]"
          : "bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#1976D2]"
      }`}
    >
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {isSuper ? (
          <>
            <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </>
        ) : (
          <>
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-10 left-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute right-1/3 top-1/2 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          </>
        )}
      </div>

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Left brand panel */}
        <div
          className={`flex flex-1 flex-col justify-between p-8 lg:p-12 ${
            isSuper ? "text-slate-200" : "text-white"
          }`}
        >
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${
                  isSuper
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-[#0B1220]"
                    : "bg-white/15 backdrop-blur-md ring-1 ring-white/20"
                }`}
              >
                {isSuper ? (
                  <ShieldCheck size={24} strokeWidth={2.2} />
                ) : (
                  <span className="text-lg font-bold">CL</span>
                )}
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">
                  ISP Log Server
                </div>
                <div className={`text-sm ${isSuper ? "text-slate-400" : "text-blue-100"}`}>
                  Cyber Link Communication
                </div>
              </div>
            </div>

            <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
              {isSuper
                ? "Super Admin Control Center"
                : "Premium Log Management Dashboard"}
            </h1>
            <p
              className={`mt-4 max-w-sm text-base leading-relaxed ${
                isSuper ? "text-slate-400" : "text-blue-100/90"
              }`}
            >
              {isSuper
                ? "Restricted access portal with enhanced security for system administrators."
                : "Real-time NAT/PPPoE logs, device monitoring, search, and analytics in one place."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {(isSuper
                ? ["256-bit session", "IP logging", "2FA ready", "Audit trail"]
                : ["Live stream", "14 modules", "Multi-device", "Role-based"]
              ).map((badge) => (
                <span
                  key={badge}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isSuper
                      ? "bg-white/5 ring-1 ring-white/10 text-slate-300"
                      : "bg-white/10 text-blue-50 ring-1 ring-white/15"
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div
            className={`mt-10 hidden items-center gap-2 text-sm lg:flex ${
              isSuper ? "text-slate-500" : "text-blue-200/80"
            }`}
          >
            <Wifi size={14} />
            <span>Secure encrypted connection · TLS 1.3</span>
          </div>
        </div>

        {/* Right login card */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div
            className={`w-full max-w-[420px] rounded-2xl p-8 shadow-2xl ${
              isSuper
                ? "border border-white/10 bg-[#111827]/80 backdrop-blur-xl ring-1 ring-amber-500/10"
                : "border border-white/20 bg-white/95 backdrop-blur-xl shadow-blue-900/20"
            }`}
          >
            <div className="mb-7">
              {isSuper && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">
                  <Shield size={13} />
                  Restricted Super Admin Portal
                </div>
              )}
              <h2
                className={`text-2xl font-bold tracking-tight ${
                  isSuper ? "text-white" : "text-[#0F172A]"
                }`}
              >
                {title}
              </h2>
              <p
                className={`mt-1.5 text-sm ${
                  isSuper ? "text-slate-400" : "text-[#64748B]"
                }`}
              >
                {subtitle}
              </p>
            </div>

            {children}

            {footer && (
              <div
                className={`mt-6 border-t pt-5 text-center text-xs ${
                  isSuper
                    ? "border-white/10 text-slate-500"
                    : "border-[#E2E8F0] text-[#94A3B8]"
                }`}
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  dark = false,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dark?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label
        className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${
          dark ? "text-slate-400" : "text-[#64748B]"
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all ${
          dark
            ? "border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            : "border border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-[#CBD5E1] focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20"
        }`}
      />
      {hint && (
        <p className={`mt-1 text-[11px] ${dark ? "text-slate-500" : "text-[#94A3B8]"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function AuthSubmit({
  loading,
  label,
  dark = false,
}: {
  loading: boolean;
  label: string;
  dark?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`mt-2 w-full rounded-xl py-3.5 text-sm font-semibold transition-all disabled:opacity-60 ${
        dark
          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-[#0B1220] shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
          : "bg-gradient-to-r from-[#1565C0] to-[#1976D2] text-white shadow-lg shadow-blue-600/25 hover:from-[#0D47A1] hover:to-[#1565C0]"
      }`}
    >
      {loading ? "Authenticating..." : label}
    </button>
  );
}

export function AuthError({ message, dark = false }: { message: string; dark?: boolean }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        dark
          ? "border border-red-500/20 bg-red-500/10 text-red-300"
          : "border border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message}
    </div>
  );
}

export function AuthPortalLink({
  href,
  label,
  dark = false,
}: {
  href: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`font-medium hover:underline ${
        dark ? "text-amber-400" : "text-[#1565C0]"
      }`}
    >
      {label}
    </Link>
  );
}
