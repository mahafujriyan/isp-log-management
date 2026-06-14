"use client";

import { useEffect, useState } from "react";
import type { Plan, Tenant } from "@isp/core/types";
import {
  Ban,
  CheckCircle,
  Database,
  MoreHorizontal,
  Plus,
  Shield,
  X,
} from "lucide-react";

interface TenantManagerProps {
  variant?: "light" | "dark";
  onTenantsChange?: (tenants: Tenant[]) => void;
}

function statusStyle(status: string, dark: boolean) {
  if (status === "active") {
    return dark
      ? "bg-green-500/10 text-green-400 ring-green-500/20"
      : "bg-green-50 text-green-700 ring-green-200";
  }
  if (status === "suspended") {
    return dark
      ? "bg-red-500/10 text-red-400 ring-red-500/20"
      : "bg-red-50 text-red-700 ring-red-200";
  }
  return dark
    ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
    : "bg-amber-50 text-amber-700 ring-amber-200";
}

export function TenantManager({ variant = "light", onTenantsChange }: TenantManagerProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [planId, setPlanId] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const dark = variant === "dark";

  function applyTenants(data: Tenant[]) {
    setTenants(data);
    onTenantsChange?.(data);
  }

  async function loadTenants() {
    const res = await fetch("/api/tenants");
    const data = await res.json();
    if (Array.isArray(data)) {
      applyTenants(data);
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
        if (Array.isArray(tenantData)) applyTenants(tenantData);
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

  async function updateStatus(tenantId: number, status: string) {
    setUpdatingId(tenantId);
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await loadTenants();
    } finally {
      setUpdatingId(null);
    }
  }

  const columns = ["ID", "Admin", "Email", "Schema", "Plan", "Status", "Created", "Expires", "Actions"];

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
        <div
          className={`rounded-md px-3 py-2 text-[12px] ${
            dark ? "bg-red-500/10 text-red-300" : "bg-[#FFF8E1] text-[#E65100]"
          }`}
        >
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr
                className={`border-b text-left text-xs ${
                  dark ? "border-white/10 text-slate-500" : "border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                {columns.map((h) => (
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
                  <td className="mono py-3 pr-4 text-xs">{t.schema_name}</td>
                  <td className="py-3 pr-4">{t.plan_name ?? `Plan #${t.plan_id}`}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ring-1 ${statusStyle(t.status, dark)}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {new Date(t.expires_at).toLocaleDateString()}
                  </td>
                  <td className="relative py-3">
                    <button
                      type="button"
                      disabled={updatingId === t.id}
                      onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                      className={`rounded-lg p-1.5 ${
                        dark ? "hover:bg-white/10" : "hover:bg-[#F1F5F9]"
                      }`}
                      aria-label="Tenant actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenuId === t.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div
                          className={`absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border shadow-xl ${
                            dark
                              ? "border-white/10 bg-[#111827]"
                              : "border-[#E2E8F0] bg-white"
                          }`}
                        >
                          {t.status !== "active" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(t.id, "active")}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-xs ${
                                dark ? "text-green-400 hover:bg-white/5" : "text-green-700 hover:bg-green-50"
                              }`}
                            >
                              <CheckCircle size={14} />
                              Activate
                            </button>
                          )}
                          {t.status !== "suspended" && (
                            <button
                              type="button"
                              onClick={() => updateStatus(t.id, "suspended")}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-xs ${
                                dark ? "text-red-400 hover:bg-white/5" : "text-red-700 hover:bg-red-50"
                              }`}
                            >
                              <Ban size={14} />
                              Suspend
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
