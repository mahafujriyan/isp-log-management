"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useRole } from "@/hooks/useRole";
import {
  Building2,
  CheckCircle2,
  Globe,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Server,
  Trash2,
} from "lucide-react";

type CompanyForm = {
  company_name: string;
  logo_url: string;
  tagline: string;
  server_ip: string;
  alert_email: string;
  support_phone: string;
  website: string;
  address: string;
  timezone: string;
  log_retention_days: number;
};

const EMPTY: CompanyForm = {
  company_name: "",
  logo_url: "",
  tagline: "",
  server_ip: "",
  alert_email: "",
  support_phone: "",
  website: "",
  address: "",
  timezone: "Asia/Dhaka",
  log_retention_days: 90,
};

const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Dubai",
  "UTC",
];

const TABS = [
  { id: "branding", label: "Branding" },
  { id: "contact", label: "Contact" },
  { id: "system", label: "System" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] text-white outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20";

export function OperatorAccountSettings() {
  const { tenantId, activeTenant } = useTenantContext();
  const { isDemo } = useRole();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("branding");
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company?tenant_id=${tenantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed to load settings");
      const s = data.settings ?? {};
      setForm({
        company_name: s.company_name ?? "",
        logo_url: s.logo_url ?? "",
        tagline: s.tagline ?? "",
        server_ip: s.server_ip ?? "",
        alert_email: s.alert_email ?? "",
        support_phone: s.support_phone ?? "",
        website: s.website ?? "",
        address: s.address ?? "",
        timezone: s.timezone ?? "Asia/Dhaka",
        log_retention_days: Number(s.log_retention_days ?? 90),
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  function update(patch: Partial<CompanyForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleLogoFile(file: File | null) {
    if (!file) return;
    if (isDemo) {
      setError("Demo accounts cannot upload logos. Use a production operator login.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Logo must be under 4 MB.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/company/logo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Upload failed");
      update({ logo_url: data.url });
      setMessage("Logo uploaded to ImageBB. Click Save to apply.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (isDemo) {
      setError("Demo accounts cannot save changes. Use a production operator login.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Save failed");
      setMessage("Account settings saved successfully.");
      setForm((f) => ({
        ...f,
        company_name: data.company_name ?? f.company_name,
        logo_url: data.logo_url ?? f.logo_url,
        tagline: data.tagline ?? f.tagline,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <Loader2 className="animate-spin text-blue-400" size={28} />
      </div>
    );
  }

  const initials = form.company_name
    ? form.company_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "CL";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {isDemo && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-200">
          Demo preview — you can explore all fields. Saving is disabled on demo accounts.
        </div>
      )}

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-[13px] text-blue-200"
        >
          <CheckCircle2 size={16} /> {message}
        </motion.div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main form */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm">
          <div className="mb-6 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${
                  tab === t.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "border border-white/10 text-white/50 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "branding" && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wider text-white/40">
                  Company logo
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    {form.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-2xl font-black text-blue-400">{initials}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading || isDemo}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                      {uploading ? "Uploading..." : "Upload to ImageBB"}
                    </button>
                    {form.logo_url && (
                      <button
                        type="button"
                        onClick={() => update({ logo_url: "" })}
                        className="inline-flex items-center gap-2 text-[12px] text-white/40 hover:text-red-400"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                    <p className="text-[11px] text-white/30">PNG, JPG, WebP · max 4 MB · hosted on ImageBB</p>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/50">Company name *</span>
                <input
                  required
                  value={form.company_name}
                  onChange={(e) => update({ company_name: e.target.value })}
                  placeholder="Cyber Link Communication"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/50">Tagline</span>
                <input
                  value={form.tagline}
                  onChange={(e) => update({ tagline: e.target.value })}
                  placeholder="Professional ISP Log Management"
                  className={inputClass}
                />
              </label>
            </div>
          )}

          {tab === "contact" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
                  <Mail size={13} /> Alert / support email
                </span>
                <input
                  type="email"
                  value={form.alert_email}
                  onChange={(e) => update({ alert_email: e.target.value })}
                  placeholder="noc@yourisp.com"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
                  <Phone size={13} /> Support phone
                </span>
                <input
                  value={form.support_phone}
                  onChange={(e) => update({ support_phone: e.target.value })}
                  placeholder="+880 1XXX XXXXXX"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
                  <Globe size={13} /> Website
                </span>
                <input
                  value={form.website}
                  onChange={(e) => update({ website: e.target.value })}
                  placeholder="https://yourisp.com"
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
                  <MapPin size={13} /> Office address
                </span>
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(e) => update({ address: e.target.value })}
                  placeholder="Dhaka, Bangladesh"
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>
          )}

          {tab === "system" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
                  <Server size={13} /> Log server IP
                </span>
                <input
                  value={form.server_ip}
                  onChange={(e) => update({ server_ip: e.target.value })}
                  placeholder="160.187.175.30"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/50">Timezone</span>
                <select
                  value={form.timezone}
                  onChange={(e) => update({ timezone: e.target.value })}
                  className={inputClass}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-[#0B1220]">
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[12px] font-semibold text-white/50">Log retention (days)</span>
                <input
                  type="number"
                  min={7}
                  max={3650}
                  value={form.log_retention_days}
                  onChange={(e) => update({ log_retention_days: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>
            </div>
          )}

          <div className="mt-8 flex justify-end border-t border-white/[0.06] pt-6">
            <motion.button
              type="button"
              whileHover={{ scale: isDemo ? 1 : 1.02 }}
              whileTap={{ scale: isDemo ? 1 : 0.98 }}
              onClick={handleSave}
              disabled={saving || isDemo || !form.company_name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save account settings
            </motion.button>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-blue-600/20 to-transparent p-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-blue-300/80">Live preview</p>
            <div className="rounded-xl border border-white/10 bg-[#071525] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600/30">
                  {form.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logo_url} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-sm font-black text-blue-300">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold text-white">
                    {form.company_name || "Your Company"}
                  </div>
                  <div className="truncate text-[11px] text-white/40">
                    {form.tagline || "ISP Log Management"}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[12px] text-white/50">
              {form.alert_email && <div className="flex items-center gap-2"><Mail size={12} /> {form.alert_email}</div>}
              {form.support_phone && <div className="flex items-center gap-2"><Phone size={12} /> {form.support_phone}</div>}
              {form.website && <div className="flex items-center gap-2"><Globe size={12} /> {form.website}</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-[12px] text-white/40">
            <div className="mb-2 flex items-center gap-2 font-semibold text-white/60">
              <Building2 size={14} /> Tenant
            </div>
            <p>{activeTenant?.admin_name ?? "Default tenant"}</p>
            <p className="mt-1 font-mono text-[11px] text-white/30">
              {activeTenant?.schema_name ?? `tenant_${tenantId}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
