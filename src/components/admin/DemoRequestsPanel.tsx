"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoRequestRecord, ProvisionDemoResult } from "@/types/demo-request.types";
import { Check, Clock, Loader2, Mail, Play, User } from "lucide-react";

type ProvisionForm = {
  password: string;
  duration_value: string;
  duration_unit: "minutes" | "hours";
};

function statusStyle(status: string) {
  if (status === "provisioned") return "bg-blue-500/20 text-blue-300";
  if (status === "expired") return "bg-slate-500/20 text-slate-400";
  return "bg-amber-500/20 text-amber-300";
}

export function DemoRequestsPanel() {
  const [rows, setRows] = useState<DemoRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionDemoResult | null>(null);
  const [lastPassword, setLastPassword] = useState("");
  const [form, setForm] = useState<ProvisionForm>({
    password: "",
    duration_value: "2",
    duration_unit: "hours",
  });

  const loadRows = useCallback(async () => {
    const res = await fetch("/api/demo-requests");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data.detail ?? data.error ?? "Failed to load demo requests");
    }
    setRows(data);
    setError("");
  }, []);

  useEffect(() => {
    loadRows()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [loadRows]);

  async function provision(requestId: number) {
    setSubmitting(true);
    setError("");
    setMessage("");
    setResult(null);
    try {
      const res = await fetch(`/api/demo-requests/${requestId}/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Provision failed");
      setLastPassword(form.password);
      setResult(data);
      setMessage("Demo account created. Share the credentials below with the customer.");
      setActiveId(null);
      setForm((f) => ({ ...f, password: "" }));
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provision failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111827]/60 p-8 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading demo requests...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-slate-400">
        Marketing form submissions appear here. Create a time-limited demo login using the shared sandbox
        (<code className="text-blue-300">tenant_demo</code>) — no access to production tenants.
      </p>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">{error}</p>
      )}
      {message && (
        <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-[13px] text-blue-200">
          <Check size={14} className="mr-1 inline" /> {message}
        </p>
      )}

      {result && (
        <div className="rounded-2xl border border-blue-500/30 bg-[#0B1220] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Demo credentials</h3>
          <div className="grid gap-2 text-[13px] text-slate-300">
            <div><span className="text-slate-500">Login URL:</span> {result.login_url}</div>
            <div><span className="text-slate-500">Email:</span> {result.email}</div>
            <div><span className="text-slate-500">Password:</span> {lastPassword}</div>
            <div><span className="text-slate-500">Expires:</span> {new Date(result.demo_expires_at).toLocaleString()}</div>
            <div><span className="text-slate-500">Sandbox:</span> {result.schema_name}</div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#111827]/60 p-8 text-center text-slate-500">
          No demo requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-white/10 bg-[#111827]/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-white">{row.full_name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-slate-500">{row.company}</p>
                </div>
                <div className="text-[11px] text-slate-500">
                  {new Date(row.created_at).toLocaleString()}
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-[13px] text-slate-300 sm:grid-cols-2">
                <div className="flex items-center gap-2"><Mail size={14} className="text-blue-400" /> {row.email}</div>
                {row.phone ? <div>{row.phone}</div> : null}
                {row.plan_interest ? <div>Plan: {row.plan_interest}</div> : null}
                {row.demo_expires_at ? (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-400" />
                    Expires {new Date(row.demo_expires_at).toLocaleString()}
                  </div>
                ) : null}
              </div>

              {row.message ? (
                <p className="mt-3 rounded-lg bg-[#0B1220] px-3 py-2 text-[12px] text-slate-400">{row.message}</p>
              ) : null}

              {row.status !== "provisioned" || (row.demo_expires_at && new Date(row.demo_expires_at) <= new Date()) ? (
                <div className="mt-4 border-t border-white/10 pt-4">
                  {activeId === row.id ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] text-slate-400">Demo password *</span>
                        <input
                          type="text"
                          value={form.password}
                          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="Min 6 characters"
                          className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-[13px] text-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-slate-400">Duration</span>
                        <input
                          type="number"
                          min={1}
                          value={form.duration_value}
                          onChange={(e) => setForm((f) => ({ ...f, duration_value: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-[13px] text-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-slate-400">Unit</span>
                        <select
                          value={form.duration_unit}
                          onChange={(e) => setForm((f) => ({ ...f, duration_unit: e.target.value as "minutes" | "hours" }))}
                          className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-[13px] text-white"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      </label>
                      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
                        <button
                          type="button"
                          onClick={() => setActiveId(null)}
                          className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-slate-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submitting || form.password.length < 6}
                          onClick={() => provision(row.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                          Create demo account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setActiveId(row.id); setResult(null); setMessage(""); }}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600/20 px-4 py-2 text-[12px] font-semibold text-blue-300 hover:bg-blue-600/30"
                    >
                      <User size={14} /> Provision demo login
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
