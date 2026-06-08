"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppMenu, RoleMenuAssignment } from "@/types/menu.types";
import type { DashboardPageId } from "@/types";
import { ALL_ROLES, ROLE_LABELS } from "@/constants/roles.constants";
import { Tag } from "@/components/shared/Tag";
import {
  ChevronRight,
  Home,
  Link2,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const PAGE_OPTIONS: { id: DashboardPageId; label: string; section: string }[] = [
  { id: "dashboard", label: "Dashboard", section: "main" },
  { id: "stream", label: "Log Stream", section: "main" },
  { id: "analytics", label: "Analytics", section: "main" },
  { id: "devices", label: "Devices", section: "main" },
  { id: "disabled", label: "Disabled Devices", section: "main" },
  { id: "search", label: "Search Log", section: "main" },
  { id: "usermgr", label: "User Manager", section: "admin" },
  { id: "rolemgr", label: "Role Manager", section: "admin" },
  { id: "servermgr", label: "Server Manager", section: "admin" },
  { id: "menumgr", label: "Menu Manager", section: "admin" },
  { id: "serviceinfo", label: "Service Info", section: "system" },
  { id: "btrc", label: "BTRC Compliance", section: "system" },
  { id: "company", label: "Company Settings", section: "system" },
  { id: "faq", label: "FAQ", section: "system" },
];

const LEGACY_URLS: Partial<Record<DashboardPageId, string>> = {
  dashboard: "/LogServer/Index",
  stream: "/LogServer/TraceRoute",
  analytics: "/Analytics/Index",
  devices: "/Server/Index",
  disabled: "/Server/DisabledServers",
  search: "/SearchLog/SearchResult",
  usermgr: "/UserManager/Index",
  rolemgr: "/UserManager/UserRole",
  servermgr: "/UserManager/UserServer",
  menumgr: "/UserManager/RoleMenu",
  serviceinfo: "/ServiceInfo/Index",
  btrc: "/BTRC/Index",
  company: "/CompanySettings/Index",
  faq: "/FAQ/Index",
};

function roleTagVariant(role: string) {
  if (role === "super_admin") return "sa" as const;
  if (role === "operator") return "op" as const;
  return "vw" as const;
}

export function MenuManagerPanel() {
  const [menus, setMenus] = useState<AppMenu[]>([]);
  const [assignments, setAssignments] = useState<RoleMenuAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState(ALL_ROLES[0]);
  const [assignMenuId, setAssignMenuId] = useState<number | "">("");
  const [menuLabel, setMenuLabel] = useState("");
  const [menuPageId, setMenuPageId] = useState<DashboardPageId>("dashboard");
  const [menuUrl, setMenuUrl] = useState(LEGACY_URLS.dashboard ?? "/LogServer/Index");
  const [menuSection, setMenuSection] = useState("main");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [menusRes, assignRes] = await Promise.all([
      fetch("/api/menus"),
      fetch("/api/menus/assignments"),
    ]);
    const menusData = await menusRes.json();
    const assignData = await assignRes.json();

    if (!menusRes.ok) {
      throw new Error(menusData.detail ?? menusData.error ?? "Failed to load menus");
    }
    if (!assignRes.ok) {
      throw new Error(assignData.detail ?? assignData.error ?? "Failed to load assignments");
    }

    setMenus(menusData);
    setAssignments(assignData);
    setError(null);
  }, []);

  useEffect(() => {
    loadData()
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [loadData]);

  const filteredAssignments = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (row) =>
        ROLE_LABELS[row.role].toLowerCase().includes(q) ||
        row.menu_label.toLowerCase().includes(q) ||
        row.menu_url.toLowerCase().includes(q)
    );
  }, [assignments, roleSearch]);

  const filteredMenus = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter(
      (row) =>
        row.label.toLowerCase().includes(q) ||
        row.url_path.toLowerCase().includes(q) ||
        row.page_id.toLowerCase().includes(q)
    );
  }, [menus, menuSearch]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignMenuId) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/menus/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: assignRole, menu_id: assignMenuId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Assign failed");
      setAssignments((prev) => {
        const withoutDup = prev.filter((row) => row.id !== data.id);
        return [...withoutDup, data].sort(
          (a, b) => a.role.localeCompare(b.role) || a.menu_label.localeCompare(b.menu_label)
        );
      });
      setShowAssignForm(false);
      setAssignMenuId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMenu(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: menuLabel,
          page_id: menuPageId,
          url_path: menuUrl,
          section: menuSection,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Create failed");
      setMenus((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setShowMenuForm(false);
      setMenuLabel("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAssignment(id: number) {
    if (!confirm("Remove this menu permission from the role?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/menus/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? "Delete failed");
      }
      setAssignments((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteMenu(id: number) {
    if (!confirm("Delete this menu? All role assignments will also be removed.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? "Delete failed");
      }
      setMenus((prev) => prev.filter((row) => row.id !== id));
      setAssignments((prev) => prev.filter((row) => row.menu_id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
        <Loader2 className="animate-spin text-[#1565C0]" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
        <div className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
          <Home size={14} />
          <span>Home</span>
          <ChevronRight size={14} />
          <span className="font-medium text-[#1565C0]">Current Menus and related Roles</span>
        </div>
        <div className="text-[11px] text-[#94A3B8]">
          {menus.length} menus · {assignments.length} role assignments
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C]">
          {error}. Run <code className="rounded bg-white px-1">npm run db:setup</code> if tables are missing.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Role ↔ Menu permissions */}
        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-semibold text-[#0F172A]">Menu permissions by role</h2>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setShowAssignForm(true);
                }}
                className="ml-auto flex items-center gap-1 rounded-lg bg-[#1976D2] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-[#1565C0]"
              >
                <Plus size={14} />
                Assign Menu Role
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search role or menu..."
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-[12px] outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20"
              />
            </div>
          </div>

          <div className="dashboard-scroll max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-[11px] font-medium text-[#64748B]">
                  {["#", "Role", "Menu", "Action"].map((h) => (
                    <th key={h} className="border-b border-[#E2E8F0] px-3 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[#94A3B8]">
                      No assignments found
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((row, index) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      <td className="border-b border-[#F1F5F9] px-3 py-2 text-[#94A3B8]">{index + 1}</td>
                      <td className="border-b border-[#F1F5F9] px-3 py-2">
                        <Tag variant={roleTagVariant(row.role)}>{ROLE_LABELS[row.role]}</Tag>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-3 py-2 font-medium text-[#1E293B]">
                        {row.menu_label}
                      </td>
                      <td className="border-b border-[#F1F5F9] px-3 py-2">
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => deleteAssignment(row.id)}
                          className="rounded-lg p-1.5 text-[#C62828] transition hover:bg-[#FFEBEE] disabled:opacity-50"
                          aria-label={`Remove ${row.menu_label} from ${ROLE_LABELS[row.role]}`}
                        >
                          {deletingId === row.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Menu list */}
        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-semibold text-[#0F172A]">Menu list</h2>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setShowMenuForm(true);
                }}
                className="ml-auto flex items-center gap-1 rounded-lg bg-[#1976D2] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-[#1565C0]"
              >
                <Plus size={14} />
                Add Menu
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search menu or URL..."
                className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-[12px] outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#1976D2]/20"
              />
            </div>
          </div>

          <div className="dashboard-scroll max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-[11px] font-medium text-[#64748B]">
                  {["#", "Menu", "Url", "Action"].map((h) => (
                    <th key={h} className="border-b border-[#E2E8F0] px-3 py-2 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMenus.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[#94A3B8]">
                      No menus found
                    </td>
                  </tr>
                ) : (
                  filteredMenus.map((row, index) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      <td className="border-b border-[#F1F5F9] px-3 py-2 text-[#94A3B8]">{index + 1}</td>
                      <td className="border-b border-[#F1F5F9] px-3 py-2">
                        <div className="font-medium text-[#1E293B]">{row.label}</div>
                        <div className="text-[10px] capitalize text-[#94A3B8]">{row.section}</div>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-3 py-2">
                        <code className="mono rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] text-[#475569]">
                          {row.url_path}
                        </code>
                      </td>
                      <td className="border-b border-[#F1F5F9] px-3 py-2">
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => deleteMenu(row.id)}
                          className="rounded-lg p-1.5 text-[#C62828] transition hover:bg-[#FFEBEE] disabled:opacity-50"
                          aria-label={`Delete ${row.label}`}
                        >
                          {deletingId === row.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Assign modal */}
      {showAssignForm && (
        <Modal title="Assign menu to role" onClose={() => setShowAssignForm(false)}>
          <form onSubmit={handleAssign} className="flex flex-col gap-3">
            <Field label="Role">
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as typeof assignRole)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
              >
                {ALL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Menu">
              <select
                value={assignMenuId}
                onChange={(e) => setAssignMenuId(e.target.value ? Number(e.target.value) : "")}
                required
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
              >
                <option value="">Select menu...</option>
                {menus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.label}
                  </option>
                ))}
              </select>
            </Field>
            {formError && <FormError message={formError} />}
            <ModalActions submitting={submitting} submitLabel="Assign" onCancel={() => setShowAssignForm(false)} />
          </form>
        </Modal>
      )}

      {/* Add menu modal */}
      {showMenuForm && (
        <Modal title="Add new menu" onClose={() => setShowMenuForm(false)}>
          <form onSubmit={handleAddMenu} className="flex flex-col gap-3">
            <Field label="Menu label">
              <input
                value={menuLabel}
                onChange={(e) => setMenuLabel(e.target.value)}
                required
                placeholder="e.g. Dashboard"
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
              />
            </Field>
            <Field label="Page">
              <select
                value={menuPageId}
                onChange={(e) => {
                  const id = e.target.value as DashboardPageId;
                  setMenuPageId(id);
                  const option = PAGE_OPTIONS.find((p) => p.id === id);
                  if (option) {
                    setMenuSection(option.section);
                    if (!menuLabel) setMenuLabel(option.label);
                  }
                  setMenuUrl(LEGACY_URLS[id] ?? `/Page/${id}`);
                }}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
              >
                {PAGE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL path">
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  value={menuUrl}
                  onChange={(e) => setMenuUrl(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-[12px]"
                />
              </div>
            </Field>
            <Field label="Section">
              <select
                value={menuSection}
                onChange={(e) => setMenuSection(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
              >
                <option value="main">Main</option>
                <option value="admin">Admin</option>
                <option value="system">System</option>
              </select>
            </Field>
            {formError && <FormError message={formError} />}
            <ModalActions submitting={submitting} submitLabel="Add menu" onCancel={() => setShowMenuForm(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#0F172A]/40" aria-label="Close dialog" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#0F172A]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[#64748B]">{label}</span>
      {children}
    </label>
  );
}

function FormError({ message }: { message: string }) {
  return <p className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-[11px] text-[#B91C1C]">{message}</p>;
}

function ModalActions({
  submitting,
  submitLabel,
  onCancel,
}: {
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[12px] font-medium text-[#64748B] hover:bg-[#F8FAFC]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-lg bg-[#1976D2] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#1565C0] disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
