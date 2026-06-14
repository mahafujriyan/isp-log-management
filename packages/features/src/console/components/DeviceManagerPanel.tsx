"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Device } from "@isp/core/types";
import { useTenantContext } from "@isp/auth/hooks/useTenantContext";
import { Tag } from "@isp/ui/Tag";
import { Edit, Loader2, Plus, Trash2, X } from "lucide-react";

interface DeviceManagerPanelProps {
  variant?: "devices" | "servers";
}

export function DeviceManagerPanel({ variant = "devices" }: DeviceManagerPanelProps) {
  const { tenantId, tenants, setTenantId } = useTenantContext();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ip: "",
    config: "NAT" as "NAT" | "ACCESS",
    nat_ip: "",
    user: "log",
    port: 514,
    listen_port: 514,
    api_user: "admin",
    api_password: "",
    api_port: 8728,
  });
  const [logServerIp, setLogServerIp] = useState("");

  const label = variant === "servers" ? "Server" : "Device";
  const plural = variant === "servers" ? "servers" : "devices";

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/devices?tenant_id=${tenantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed to load");
      setDevices(data.devices ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (variant !== "servers") return;
    fetch(`/api/company?tenant_id=${tenantId}`)
      .then((r) => r.json())
      .then((d) => {
        const ip = d.settings?.server_ip?.trim();
        if (ip) setLogServerIp(ip);
        else if (typeof window !== "undefined") {
          setLogServerIp(window.location.hostname);
        }
      })
      .catch(() => {
        if (typeof window !== "undefined") setLogServerIp(window.location.hostname);
      });
  }, [tenantId, variant]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.ip.includes(q) ||
        d.nat_ip.includes(q)
    );
  }, [devices, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      ip: "",
      config: "NAT",
      nat_ip: "",
      user: "log",
      port: 514,
      listen_port: 514,
      api_user: "admin",
      api_password: "",
      api_port: 8728,
    });
    setShowForm(true);
  }

  function openEdit(device: Device) {
    setEditing(device);
    setForm({
      name: device.name,
      ip: device.ip,
      config: device.config,
      nat_ip: device.nat_ip,
      user: device.user,
      port: device.port,
      listen_port: device.listen_port,
      api_user: device.user || "admin",
      api_password: "",
      api_port: 8728,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name,
        device_ip: form.ip,
        config_type: form.config,
        nat_ip: form.nat_ip || form.ip,
        syslog_user: form.user || form.api_user,
        syslog_port: form.port,
        listen_port: form.listen_port,
        api_user: form.api_user.trim() || undefined,
        api_password: form.api_password.trim() || undefined,
        api_port: form.api_port,
      };

      const res = await fetch(editing ? `/api/devices/${editing.id}` : "/api/devices", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Save failed");
      setShowForm(false);
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(device: Device) {
    if (!confirm(`Delete ${device.name}?`)) return;
    try {
      const res = await fetch(`/api/devices/${device.id}?tenant_id=${tenantId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? data.error ?? "Delete failed");
      }
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {tenants.length > 1 && (
          <select
            value={tenantId}
            onChange={(e) => setTenantId(Number(e.target.value))}
            className="rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.schema_name}
              </option>
            ))}
          </select>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${plural}...`}
          className="w-[200px] rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
        />
        <button
          type="button"
          onClick={openCreate}
          className="ml-auto flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white"
        >
          <Plus size={13} /> Add {label}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#B91C1C]">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-[#1565C0]" size={24} />
        </div>
      ) : (
        <div className="dashboard-scroll max-h-[480px] overflow-y-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="sticky top-0 bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
                {["#", `${label} Name`, "IP", "Config", "NAT IP", "User", "Port", "Listen", "Status", "Users Today", "Action"].map((h) => (
                  <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[#94A3B8]">
                    No {plural} found
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr key={d.id} className="hover:bg-[#F8FAFC]">
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{i + 1}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 font-medium">{d.name}</td>
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.ip}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                      <Tag variant={d.config === "NAT" ? "nat" : "acc"}>{d.config}</Tag>
                    </td>
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.nat_ip}</td>
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.user}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{d.port}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{d.listen_port}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                      <Tag variant={d.status === "offline" ? "off" : "ok"}>
                        {d.status === "offline" ? "Offline" : "● Receiving"}
                      </Tag>
                    </td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center">{d.users_today}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                      <button type="button" onClick={() => openEdit(d)} className="mr-1.5 inline text-[#1565C0]">
                        <Edit size={15} />
                      </button>
                      <button type="button" onClick={() => handleDelete(d)} className="inline text-[#C62828]">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} aria-label="Close" />
          <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">{editing ? `Edit ${label}` : `Add ${label}`}</h3>
              <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            {variant === "servers" && (
              <p className="mb-3 rounded-lg bg-[#EFF6FF] px-3 py-2 text-[11px] leading-relaxed text-[#1E40AF]">
                Password is <strong>optional</strong> — leave empty to add syslog-only device.
                MikroTik remote syslog: <strong>{logServerIp || "160.187.175.30"}:514</strong> (no password needed).
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              {variant === "servers" && (
                <label className="col-span-2">
                  <span className="mb-1 block text-[#64748B]">Website / Log server IP</span>
                  <input
                    type="text"
                    readOnly
                    value={logServerIp || "160.187.175.30"}
                    className="w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[#64748B]"
                  />
                </label>
              )}
              {[
                { key: "name", label: variant === "servers" ? "Server name" : "Name", col: 2 },
                { key: "ip", label: "Device IP" },
                { key: "nat_ip", label: "NAT IP" },
              ].map((f) => (
                <label key={f.key} className={f.col === 2 ? "col-span-2" : ""}>
                  <span className="mb-1 block text-[#64748B]">{f.label}</span>
                  <input
                    type="text"
                    value={String(form[f.key as keyof typeof form])}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.key === "name" || f.key === "ip"}
                    placeholder={f.key === "ip" ? "160.187.175.26" : undefined}
                    className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                  />
                </label>
              ))}
              <label>
                <span className="mb-1 block text-[#64748B]">Configuration type</span>
                <select
                  value={form.config}
                  onChange={(e) => setForm((p) => ({ ...p, config: e.target.value as "NAT" | "ACCESS" }))}
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                >
                  <option value="NAT">NAT</option>
                  <option value="ACCESS">ACCESS</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[#64748B]">Listening port</span>
                <input
                  type="number"
                  value={form.listen_port}
                  onChange={(e) => setForm((p) => ({ ...p, listen_port: Number(e.target.value) }))}
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                />
              </label>
              {variant === "servers" ? (
                <>
                  <label>
                    <span className="mb-1 block text-[#64748B]">User name</span>
                    <input
                      value={form.api_user}
                      onChange={(e) => setForm((p) => ({ ...p, api_user: e.target.value }))}
                      placeholder="admin"
                      className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[#64748B]">Password (optional)</span>
                    <input
                      type="password"
                      value={form.api_password}
                      onChange={(e) => setForm((p) => ({ ...p, api_password: e.target.value }))}
                      placeholder="Leave empty or use e.g. admin123"
                      className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[#64748B]">API port</span>
                    <input
                      type="number"
                      value={form.api_port}
                      onChange={(e) => setForm((p) => ({ ...p, api_port: Number(e.target.value) }))}
                      className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span className="mb-1 block text-[#64748B]">Syslog user</span>
                    <input
                      value={form.user}
                      onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
                      className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[#64748B]">Port</span>
                    <input
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))}
                      className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                    />
                  </label>
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-3 py-1.5 text-[12px]">Cancel</button>
              <button type="submit" disabled={submitting} className="rounded-md bg-[#1976D2] px-3 py-1.5 text-[12px] text-white disabled:opacity-60">
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
