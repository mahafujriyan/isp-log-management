"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plan } from "@/types";
import { Check, Loader2, Plus, Save, Star, Trash2, X } from "lucide-react";

type PlanDraft = {
  name: string;
  price_bdt: string;
  max_users: string;
  max_devices: string;
  retention_days: string;
  max_logs_per_day: string;
  is_featured: boolean;
};

function toDraft(plan: Plan): PlanDraft {
  return {
    name: plan.name,
    price_bdt: String(plan.price_bdt),
    max_users: String(plan.max_users),
    max_devices: String(plan.max_devices),
    retention_days: String(plan.retention_days),
    max_logs_per_day: String(plan.max_logs_per_day),
    is_featured: Boolean(plan.is_featured),
  };
}

function emptyDraft(): PlanDraft {
  return {
    name: "",
    price_bdt: "0",
    max_users: "5",
    max_devices: "2",
    retention_days: "30",
    max_logs_per_day: "500000",
    is_featured: false,
  };
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-[13px] text-white outline-none focus:border-blue-400";

export function PlanManagerPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [drafts, setDrafts] = useState<Record<number, PlanDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newDraft, setNewDraft] = useState<PlanDraft>(emptyDraft);
  const [message, setMessage] = useState("");

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/plans");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data.detail ?? data.error ?? "Failed to load plans");
    }
    setPlans(data);
    setDrafts(Object.fromEntries(data.map((p: Plan) => [p.id, toDraft(p)])));
    setError("");
  }, []);

  useEffect(() => {
    loadPlans()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [loadPlans]);

  function updateDraft(id: number, patch: Partial<PlanDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function savePlan(id: number) {
    const draft = drafts[id];
    if (!draft) return;

    setSavingId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          price_bdt: Number(draft.price_bdt),
          max_users: Number(draft.max_users),
          max_devices: Number(draft.max_devices),
          retention_days: Number(draft.retention_days),
          max_logs_per_day: Number(draft.max_logs_per_day),
          is_featured: draft.is_featured,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Save failed");
      await loadPlans();
      setMessage("Pricing updated — marketing page will show new values.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function createPlan() {
    setSavingId("new");
    setMessage("");
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDraft.name,
          price_bdt: Number(newDraft.price_bdt),
          max_users: Number(newDraft.max_users),
          max_devices: Number(newDraft.max_devices),
          retention_days: Number(newDraft.retention_days),
          max_logs_per_day: Number(newDraft.max_logs_per_day),
          is_featured: newDraft.is_featured,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Create failed");
      setShowNew(false);
      setNewDraft(emptyDraft());
      await loadPlans();
      setMessage("New plan created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSavingId(null);
    }
  }

  async function removePlan(id: number) {
    if (!confirm("Delete this plan? It must not be assigned to any tenant.")) return;
    setDeletingId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Delete failed");
      await loadPlans();
      setMessage("Plan deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function renderFields(draft: PlanDraft, onChange: (patch: Partial<PlanDraft>) => void) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block text-[11px] text-slate-400">Plan name</span>
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClass}
            placeholder="Pro"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">Price (BDT / mo)</span>
          <input
            type="number"
            min={0}
            value={draft.price_bdt}
            onChange={(e) => onChange({ price_bdt: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">Max users</span>
          <input
            type="number"
            min={1}
            value={draft.max_users}
            onChange={(e) => onChange({ max_users: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">Max devices</span>
          <input
            type="number"
            min={1}
            value={draft.max_devices}
            onChange={(e) => onChange({ max_devices: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">Retention (days)</span>
          <input
            type="number"
            min={1}
            value={draft.retention_days}
            onChange={(e) => onChange({ retention_days: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">Max logs / day</span>
          <input
            type="number"
            min={1}
            value={draft.max_logs_per_day}
            onChange={(e) => onChange({ max_logs_per_day: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 sm:col-span-2 lg:col-span-3">
          <input
            type="checkbox"
            checked={draft.is_featured}
            onChange={(e) => onChange({ is_featured: e.target.checked })}
            className="rounded border-white/20"
          />
          <span className="flex items-center gap-1.5 text-[12px] text-slate-300">
            <Star size={13} className="text-blue-400" />
            Show as &quot;Popular&quot; on marketing page
          </span>
        </label>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111827]/60 p-8 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading plans...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-400">
          Changes here sync instantly to the public marketing page pricing section.
        </p>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={15} /> Add plan
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-[13px] text-blue-200">
          <Check size={14} className="mr-1 inline" /> {message}
        </p>
      )}

      <div className="grid gap-4">
        {plans.map((plan) => {
          const draft = drafts[plan.id] ?? toDraft(plan);
          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-white/10 bg-[#111827]/60 p-5 backdrop-blur-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-white">{plan.name}</h3>
                  <p className="text-[11px] text-slate-500">Plan ID #{plan.id}</p>
                </div>
                {plan.is_featured && (
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">
                    Popular
                  </span>
                )}
              </div>

              {renderFields(draft, (patch) => updateDraft(plan.id, patch))}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => removePlan(plan.id)}
                  disabled={deletingId === plan.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[12px] text-slate-400 hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingId === plan.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => savePlan(plan.id)}
                  disabled={savingId === plan.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingId === plan.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save changes
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <div className="rounded-2xl border border-blue-500/30 bg-[#111827]/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-white">New plan</h3>
            <button type="button" onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          {renderFields(newDraft, (patch) => setNewDraft((d) => ({ ...d, ...patch })))}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-slate-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createPlan}
              disabled={savingId === "new" || !newDraft.name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingId === "new" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
