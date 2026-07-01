"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Device } from "@isp/core/types";
import { useTenantContext } from "@isp/auth/hooks/useTenantContext";
import { Tag } from "@isp/ui/Tag";
import { Edit, Eye, EyeOff, Loader2, Plus, Power, RefreshCw, Trash2, X } from "lucide-react";

interface DeviceManagerPanelProps {
  variant?: "devices" | "servers";
}

async function readApiResponse(res: Response) {
  const text = await res.text();
  let data: { error?: string; detail?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string; detail?: string };
    } catch {
      throw new Error(
        res.ok
          ? "Invalid server response"
          : `Server error (${res.status}). Use operator URL :3002 and run npm run db:migrate on VPS.`
      );
    }
  }
  if (!res.ok) {
    throw new Error(data.detail ?? data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

function formatFetchError(err: unknown, action: string) {
  if (!(err instanceof Error)) return `${action} failed`;
  if (err.message === "Failed to fetch") {
    return `${action} failed — cannot reach API. Open http://YOUR-VPS:3002/dashboard (operator app), not port 3000/3001.`;
  }
  return err.message;
}

export function DeviceManagerPanel({ variant = "devices" }: DeviceManagerPanelProps) {
  const { tenantId, tenants, setTenantId, loading: tenantLoading } = useTenantContext();
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
    config: "NAT" as "NAT" | "ACCESS" | "BRAS",
    nat_ip: "",
    user: "log",
    port: 514,
    listen_port: 514,
    api_user: "admin",
    api_password: "",
    api_port: 8728,
  });
  const [logServerIp, setLogServerIp] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  const label = variant === "servers" ? "Server" : "Device";
  const plural = variant === "servers" ? "servers" : "devices";

  const loadDevices = useCallback(async () => {
    if (tenantLoading || tenantId == null) {
      setLoading(tenantLoading);
      return;
    }
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      const res = await fetch(`/api/devices?tenant_id=${tenantId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = (await readApiResponse(res)) as { devices?: Device[] };
      setDevices(data.devices ?? []);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Load timed out — database slow; try Recheck or contact admin");
      } else {
        setError(formatFetchError(err, "Load"));
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, tenantLoading]);

  useEffect(() => {
    loadDevices();
    if (tenantId == null) return;
    const interval = setInterval(loadDevices, 60_000);
    return () => clearInterval(interval);
  }, [loadDevices, tenantId]);

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
      api_user: device.api_user || "admin",
      api_password: "",
      api_port: device.api_port ?? 8728,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && !form.api_password.trim()) {
      setError("Router password is required to add a device");
      return;
    }
    if (!form.api_user.trim()) {
      setError("Router username is required (e.g. admin)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name,
        device_ip: form.ip,
        config_type: form.config,
        nat_ip: form.nat_ip.trim() || form.ip,
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
      await readApiResponse(res);
      setShowForm(false);
      await loadDevices();
    } catch (err) {
      setError(formatFetchError(err, "Save"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecheck() {
    if (tenantId == null) return;
    try {
      const res = await fetch(`/api/devices/recheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      await readApiResponse(res);
      await loadDevices();
    } catch (err) {
      setError(formatFetchError(err, "Recheck"));
    }
  }

  async function handleToggle(device: Device) {
    const enable = device.status === "offline";
    try {
      const res = await fetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, status: enable ? "active" : "disabled" }),
      });
      await readApiResponse(res);
      await loadDevices();
    } catch (err) {
      setError(formatFetchError(err, enable ? "Enable" : "Disable"));
    }
  }

  async function handleDelete(device: Device) {
    if (!confirm(`Delete ${device.name}?`)) return;
    try {
      const res = await fetch(`/api/devices/${device.id}?tenant_id=${tenantId}`, { method: "DELETE" });
      await readApiResponse(res);
      await loadDevices();
    } catch (err) {
      setError(formatFetchError(err, "Delete"));
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        {tenants.length > 1 && (
          <select
            value={tenantId ?? ""}
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
          onClick={handleRecheck}
          className="flex items-center gap-1 rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px] text-[#64748B] hover:bg-[#F8FAFC]"
        >
          <RefreshCw size={13} /> Recheck
        </button>
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

      {loading || tenantLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Loader2 className="animate-spin text-[#1565C0]" size={24} />
          <span className="text-[12px] text-[#64748B]">Loading devices…</span>
        </div>
      ) : (
        <div className="dashboard-scroll max-h-[560px] overflow-x-auto overflow-y-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full min-w-[1100px] border-collapse text-[12px]">
            <thead>
              <tr className="sticky top-0 bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
                {[
                  "#",
                  "Device Name",
                  "Device IP",
                  "Configuration",
                  "NAT IP",
                  "userName",
                  "Password",
                  "Port",
                  "Listening Port",
                  "Users Today",
                  "Action",
                ].map((h) => (
                  <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[#94A3B8]">
                    No {plural} found — Add Device with username + password
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? "bg-white hover:bg-[#F8FAFC]" : "bg-[#FAFBFC] hover:bg-[#F1F5F9]"}>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">{i + 1}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                      <div className="font-medium text-[#0F172A]">{d.name}</div>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          d.status === "receiving"
                            ? "bg-[#E8F5E9] text-[#2E7D32]"
                            : "bg-[#FFEBEE] text-[#C62828]"
                        }`}
                      >
                        {d.status === "receiving" ? "● Receiving logs" : "○ Offline"}
                      </span>
                    </td>
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.ip}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                      <Tag variant={d.config === "NAT" ? "nat" : "acc"}>{d.config}</Tag>
                    </td>
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5 text-[#1565C0]">{d.nat_ip}</td>
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-1.5">{d.api_user || d.user}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="mono text-[#64748B]">
                          {showPasswords[d.id] ? (d.has_api_password ? "saved ✓" : "—") : "***"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPasswords((p) => ({ ...p, [d.id]: !p[d.id] }))}
                          className="text-[#64748B] hover:text-[#1565C0]"
                          title="Password stored securely — not shown in list"
                        >
                          {showPasswords[d.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </span>
                    </td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center">{d.port}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center">{d.listen_port}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 text-center font-medium">{d.users_today}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-1.5 whitespace-nowrap">
                      <button type="button" onClick={() => openEdit(d)} className="mr-1.5 inline text-[#1565C0]" title="Edit">
                        <Edit size={15} />
                      </button>
                      <button type="button" onClick={() => handleDelete(d)} className="mr-1.5 inline text-[#C62828]" title="Delete">
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(d)}
                        className={`mr-1.5 inline ${d.status === "offline" ? "text-[#2E7D32]" : "text-[#E65100]"}`}
                        title={d.status === "offline" ? "Enable" : "Disable"}
                      >
                        <Power size={15} />
                      </button>
                      <button type="button" onClick={handleRecheck} className="inline text-[#1565C0]" title="Recheck all devices">
                        <RefreshCw size={15} />
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
                MikroTik remote syslog: <strong>{logServerIp || "160.187.175.30"}:514</strong>
              </p>
            )}
            {variant === "devices" && (
              <p className="mb-3 rounded-lg bg-[#EFF6FF] px-3 py-2 text-[11px] leading-relaxed text-[#1E40AF]">
                <strong>NAT</strong> = firewall/NAT router · <strong>ACCESS</strong> = PPPoE router (can share same NAT IP).
                Username + password required. Syslog → <strong>160.187.175.30:514</strong>
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
                { key: "name", label: variant === "servers" ? "Server name" : "Device name", col: 2 },
                { key: "ip", label: "Router IP", col: 1 },
              ].map((f) => (
                <label key={f.key} className={f.col === 2 ? "col-span-2" : ""}>
                  <span className="mb-1 block text-[#64748B]">{f.label}</span>
                  <input
                    type="text"
                    value={String(form[f.key as keyof typeof form])}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    required
                    placeholder={f.key === "ip" ? "160.187.175.26" : undefined}
                    className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                  />
                </label>
              ))}
              <label>
                <span className="mb-1 block text-[#64748B]">
                  NAT IP {form.config === "ACCESS" ? "(shared gateway — can match NAT router)" : "(public/WAN IP)"}
                </span>
                <input
                  type="text"
                  value={form.nat_ip}
                  onChange={(e) => setForm((p) => ({ ...p, nat_ip: e.target.value }))}
                  placeholder={form.config === "ACCESS" ? "e.g. 160.187.175.9 (NAT router IP)" : "Same as router IP if single WAN"}
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                />
              </label>
              <label>
                <span className="mb-1 block text-[#64748B]">Router type</span>
                <select
                  value={form.config}
                  onChange={(e) => setForm((p) => ({ ...p, config: e.target.value as "NAT" | "ACCESS" | "BRAS" }))}
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                >
                  <option value="NAT">NAT router (firewall logs)</option>
                  <option value="ACCESS">ACCESS router (PPPoE)</option>
                  <option value="BRAS">BRAS router (PPPoE)</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[#64748B]">Router username</span>
                <input
                  value={form.api_user}
                  onChange={(e) => setForm((p) => ({ ...p, api_user: e.target.value }))}
                  required
                  placeholder="admin"
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                />
              </label>
              <label>
                <span className="mb-1 block text-[#64748B]">
                  Router password {editing ? "(leave blank to keep)" : "(required)"}
                </span>
                <input
                  type="password"
                  value={form.api_password}
                  onChange={(e) => setForm((p) => ({ ...p, api_password: e.target.value }))}
                  required={!editing}
                  placeholder={editing && editing.has_api_password ? "•••••••• saved" : "MikroTik / Winbox password"}
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
              <label>
                <span className="mb-1 block text-[#64748B]">Syslog user</span>
                <input
                  value={form.user}
                  onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
                  placeholder="log"
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                />
              </label>
              <label>
                <span className="mb-1 block text-[#64748B]">Syslog port</span>
                <input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))}
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                />
              </label>
              <label>
                <span className="mb-1 block text-[#64748B]">Listen port</span>
                <input
                  type="number"
                  value={form.listen_port}
                  onChange={(e) => setForm((p) => ({ ...p, listen_port: Number(e.target.value) }))}
                  className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5"
                />
              </label>
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
