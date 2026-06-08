"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@/types";
import { ALL_ROLES, ROLE_LABELS } from "@/constants/roles.constants";
import type { AppRole } from "@/constants/roles.constants";
import { Tag } from "@/components/shared/Tag";
import { Key, Loader2, Plus, Trash2, X } from "lucide-react";

export function UserManagerPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "operator" as AppRole });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed to load users");
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  function roleTag(role: string) {
    if (role === "super_admin") return "sa" as const;
    if (role === "operator") return "op" as const;
    return "vw" as const;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Create failed");
      setShowForm(false);
      setForm({ username: "", email: "", password: "", role: "operator" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Reset failed");
      setResetUser(null);
      setForm((f) => ({ ...f, password: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? "Update failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete user ${user.username}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? "Delete failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-[200px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
        />
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white"
        >
          <Plus size={13} /> Add User
        </button>
      </div>
      {error && <div className="mb-3 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#1565C0]" size={24} /></div>
      ) : (
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
              {["#", "Username", "Email", "Role", "Created", "Status", "Action"].map((h) => (
                <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} className="hover:bg-[#F8FAFC]">
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{i + 1}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 font-medium">{u.username}</td>
                <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{u.email}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  <Tag variant={roleTag(u.role)}>{ROLE_LABELS[u.role as AppRole] ?? u.role}</Tag>
                </td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  <button type="button" onClick={() => handleToggleActive(u)}>
                    <Tag variant={u.is_active ? "ok" : "warn"}>{u.is_active ? "Active" : "Inactive"}</Tag>
                  </button>
                </td>
                <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                  <button type="button" onClick={() => setResetUser(u)} className="mr-1.5 inline text-[#E65100]"><Key size={15} /></button>
                  <button type="button" onClick={() => handleDelete(u)} className="inline text-[#C62828]"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <FormModal title="Add User" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 text-[12px]">
            <input required placeholder="Username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="rounded-md border px-2.5 py-1.5" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rounded-md border px-2.5 py-1.5" />
            <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="rounded-md border px-2.5 py-1.5" />
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AppRole }))} className="rounded-md border px-2.5 py-1.5">
              {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <SubmitRow submitting={submitting} onCancel={() => setShowForm(false)} label="Create user" />
          </form>
        </FormModal>
      )}

      {resetUser && (
        <FormModal title={`Reset password — ${resetUser.username}`} onClose={() => setResetUser(null)}>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3 text-[12px]">
            <input required type="password" placeholder="New password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="rounded-md border px-2.5 py-1.5" />
            <SubmitRow submitting={submitting} onCancel={() => setResetUser(null)} label="Reset password" />
          </form>
        </FormModal>
      )}
    </div>
  );
}

function FormModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-sm rounded-xl border bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SubmitRow({ submitting, onCancel, label }: { submitting: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5">Cancel</button>
      <button type="submit" disabled={submitting} className="rounded-md bg-[#1976D2] px-3 py-1.5 text-white disabled:opacity-60">{submitting ? "Saving..." : label}</button>
    </div>
  );
}
