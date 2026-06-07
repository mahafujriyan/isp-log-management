"use client";

import { useEffect, useState } from "react";
import type { Plan, Tenant } from "@/types";
import { Database, Plus, Shield, X } from "lucide-react";

interface TenantManagerProps {
  variant?: "light" | "dark";
}

export function TenantManager({ variant = "light" }: TenantManagerProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [planId, setPlanId] = useState(1);
  const dark = variant === "dark";

  async function loadTenants() {
    const res = await fetch("/api/tenants");
    const data = await res.json();
    if (Array.isArray(data)) {
      setTenants(data);
      setError(null);
    } else {
      setError(data.error ?? "Failed to load tenants");
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/tenants").then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
    ])
      .then(([tenantData, planData]) => {
        if (Array.isArray(tenantData)) setTenants(tenantData);
        else setError(tenantData.error ?? "Failed to load tenants");
        if (Array.isArray(planData)) {
          setPlans(planData);
          if (planData[0]) setPlanId(planData[0].id);
        }
      })
      .catch(() => setError("Could not connect to API"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_name: adminName,
          admin_email: adminEmail,
          plan_id: planId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.detail ?? data.error ?? "Creation failed");
        return;
      }
      setShowForm(false);
      setAdminName("");
      setAdminEmail("");
      await loadTenants();
    } catch {
      setFormError("Could not create tenant");
    } finally {
      setSubmitting(false);
    }
  }

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
          onClick={() => setShowForm(true)}
        >
          <span className="flex items-center gap-1">
            <Plus size={13} /> Add Tenant
          </span>
        </button>
      </div>

      {showForm && (
        <div
          className={`mb-4 rounded-xl border p-4 ${
            dark ? "border-amber-500/20 bg-[#0B1220]/80" : "border-[#E2E8F0] bg-[#F8FAFC]"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-[#0F172A]"}`}>
              New Tenant
            </h3>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close">
              <X size={16} className={dark ? "text-slate-400" : "text-[#64748B]"} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className={dark ? "text-slate-400" : "text-[#64748B]"}>Admin name</span>
              <input
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  dark ? "border-white/10 bg-[#111827] text-white" : "border-[#E2E8F0] bg-white"
                }`}
              />
            </label>
            <label className="block text-xs">
              <span className={dark ? "text-slate-400" : "text-[#64748B]"}>Admin email</span>
              <input
                required
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  dark ? "border-white/10 bg-[#111827] text-white" : "border-[#E2E8F0] bg-white"
                }`}
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className={dark ? "text-slate-400" : "text-[#64748B]"}>Plan</span>
              <select
                value={planId}
                onChange={(e) => setPlanId(Number(e.target.value))}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  dark ? "border-white/10 bg-[#111827] text-white" : "border-[#E2E8F0] bg-white"
                }`}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.max_users} users, {p.retention_days}d retention
                  </option>
                ))}
              </select>
            </label>
            {formError && (
              <p className="text-xs text-red-400 sm:col-span-2">{formError}</p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className={
                  dark
                    ? "rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0B1220] disabled:opacity-50"
                    : "rounded-md bg-[#1976D2] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                }
              >
                {submitting ? "Creating..." : "Create tenant & schema"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`rounded-md px-4 py-2 text-xs ${dark ? "text-slate-400" : "text-[#64748B]"}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <p className={`py-8 text-center text-sm ${dark ? "text-slate-500" : "text-[#64748B]"}`}>
          Loading tenants...
        </p>
      )}

      {error && (
        <div className="rounded-md bg-[#FFF8E1] px-3 py-2 text-[12px] text-[#E65100]">
          {error}. Run <code>npm run db:phase2</code> and check DATABASE_URL.
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
            No tenants yet. Click Add Tenant to provision an isolated schema.
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
              {["ID", "Admin", "Email", "Schema", "Plan", "Status", "Expires"].map((h) => (
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
                <td className="py-3 pr-4">{t.plan_name ?? `Plan #${t.plan_id}`}</td>
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
