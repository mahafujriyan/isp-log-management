"use client";

import { useEffect, useState } from "react";
import type { Tenant } from "@/lib/types";
import { Database, Plus, Shield } from "lucide-react";

interface TenantManagerProps {
  variant?: "light" | "dark";
}

export function TenantManager({ variant = "light" }: TenantManagerProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dark = variant === "dark";

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTenants(data);
        } else {
          setError(data.error ?? "Failed to load tenants");
        }
      })
      .catch(() => setError("Could not connect to API"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className={
        dark
          ? "rounded-2xl border border-white/10 bg-[#111827]/60 p-6 backdrop-blur-sm"
          : "rounded-xl border border-[#E2E8F0] bg-white p-4"
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className={dark ? "text-amber-400" : "text-[#1565C0]"} />
          <h2 className={`text-base font-semibold ${dark ? "text-white" : "text-[#0F172A]"}`}>
            Tenant Manager
          </h2>
        </div>
        <button
          type="button"
          className={
            dark
              ? "rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-semibold text-[#0B1220]"
              : "rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white"
          }
          onClick={() => alert("Tenant creation UI — PHASE 2")}
        >
          <span className="flex items-center gap-1">
            <Plus size={13} /> Add Tenant
          </span>
        </button>
      </div>

      {loading && (
        <p className={`py-8 text-center text-sm ${dark ? "text-slate-500" : "text-[#64748B]"}`}>
          Loading tenants...
        </p>
      )}

      {error && (
        <div className="rounded-md bg-[#FFF8E1] px-3 py-2 text-[12px] text-[#E65100]">
          {error}. Run <code>scripts/init-db.sql</code> and check DATABASE_URL.
        </div>
      )}

      {!loading && !error && tenants.length === 0 && (
        <div
          className={`rounded-xl border border-dashed py-10 text-center ${
            dark ? "border-white/10" : "border-[#E2E8F0]"
          }`}
        >
          <Database size={32} className={`mx-auto mb-3 ${dark ? "text-slate-600" : "text-[#CBD5E1]"}`} />
          <p className={`text-sm ${dark ? "text-slate-400" : "text-[#64748B]"}`}>
            No tenants yet. Create one via API POST /api/tenants
          </p>
        </div>
      )}

      {tenants.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr
              className={`border-b text-left text-xs ${
                dark ? "border-white/10 text-slate-500" : "border-[#E2E8F0] text-[#64748B]"
              }`}
            >
              {["ID", "Admin", "Email", "Schema", "Status", "Expires"].map((h) => (
                <th key={h} className="pb-3 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr
                key={t.id}
                className={`border-b ${dark ? "border-white/5 text-slate-300" : "border-[#F1F5F9] text-[#475569]"}`}
              >
                <td className="py-3 pr-4">{t.id}</td>
                <td className={`py-3 pr-4 font-medium ${dark ? "text-white" : "text-[#0F172A]"}`}>
                  {t.admin_name}
                </td>
                <td className="py-3 pr-4">{t.admin_email}</td>
                <td className="mono py-3 pr-4">{t.schema_name}</td>
                <td className="py-3 pr-4">
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                    {t.status}
                  </span>
                </td>
                <td className="py-3">{new Date(t.expires_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
