"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  AuthError,
  AuthField,
  AuthShell,
  AuthSubmit,
} from "./AuthShell";
import { AlertTriangle, Fingerprint, KeyRound, ShieldAlert } from "lucide-react";

export function SuperAdminLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (confirmPin !== securityCode) {
      setLoading(false);
      setAttempts((a) => a + 1);
      setError("Security PIN confirmation does not match.");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      portal: "super_admin",
      securityCode,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setAttempts((a) => a + 1);
      setError(
        result.error === "CredentialsSignin"
          ? "Access denied. Invalid credentials or security code."
          : result.error
      );
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  return (
    <AuthShell
      variant="super_admin"
      title="Super Admin Access"
      subtitle="Enhanced security verification required"
      footer={
        <span className="text-[11px] text-slate-500">
          Contact platform owner if you need access credentials.
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Security notice */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="text-[11px] leading-relaxed text-slate-400">
              This portal is monitored. Unauthorized access attempts are logged
              and may result in IP blocking. Multi-factor authentication ready
              for PHASE 5.
            </div>
          </div>
        </div>

        {error && <AuthError message={error} dark />}
        {attempts >= 2 && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
            <AlertTriangle size={14} />
            Multiple failed attempts detected. Account may be temporarily locked.
          </div>
        )}

        <AuthField
          label="Admin email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="superadmin@cyberlink.com"
          dark
        />
        <AuthField
          label="Master password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••••••"
          dark
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#111827] px-3 text-[10px] uppercase tracking-widest text-slate-500">
              Security layer
            </span>
          </div>
        </div>

        <AuthField
          label="Authorization code"
          type="password"
          value={securityCode}
          onChange={setSecurityCode}
          placeholder="Enter security code"
          dark
          hint="Default demo code: CYBER-LINK-2026"
        />
        <AuthField
          label="Confirm security PIN"
          type="password"
          value={confirmPin}
          onChange={setConfirmPin}
          placeholder="Re-enter authorization code"
          dark
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[10px] text-slate-400 ring-1 ring-white/10">
            <Fingerprint size={13} className="text-amber-400" />
            Session: 8h max
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[10px] text-slate-400 ring-1 ring-white/10">
            <KeyRound size={13} className="text-amber-400" />
            IP audit enabled
          </div>
        </div>

        <AuthSubmit loading={loading} label="Authorize & Enter Admin Panel" dark />

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
          Demo: <code className="text-amber-400">superadmin@cyberlink.com</code> /
          <code className="text-amber-400"> Super@Secure2026!</code> / code{" "}
          <code className="text-amber-400">CYBER-LINK-2026</code>
        </div>
      </form>
    </AuthShell>
  );
}
