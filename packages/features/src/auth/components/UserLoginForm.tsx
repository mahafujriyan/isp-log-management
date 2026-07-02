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
import { LockKeyhole } from "lucide-react";

export function UserLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/operator";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      portal: "user",
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  return (
    <AuthShell
      variant="user"
      title="Operator Sign In"
      subtitle="Authorized operator access only — not linked from the public website"
      footer={
        <span className="text-[11px] text-[#94A3B8]">
          Contact your administrator if you need access credentials.
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthError message={error} />}

        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="admin@cyberlink.com"
        />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••••"
        />

        <AuthSubmit loading={loading} label="Sign in to Operator Portal" />

        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-[11px] leading-relaxed text-[#64748B] ring-1 ring-[#E2E8F0]">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-[#475569]">
              <LockKeyhole size={12} />
              Dev credentials
            </div>
            Email: <code className="text-[#1565C0]">admin@cyberlink.com</code>
            <br />
            Password: <code className="text-[#1565C0]">Admin@123456</code>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
