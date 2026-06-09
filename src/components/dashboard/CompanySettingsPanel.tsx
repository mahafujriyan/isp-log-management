"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Download, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";

interface CompanySettings {
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
}

interface BackupInfo {
  file_label: string;
  size_mb: number;
  created_at: string;
}

const EMPTY: CompanySettings = {
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

export function CompanySettingsPanel() {
  const { tenantId } = useTenantContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CompanySettings>(EMPTY);
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/company?tenant_id=${tenantId}`);
      const data = await res.json();
      if (data.settings) {
        setForm({
          company_name: data.settings.company_name ?? "",
          logo_url: data.settings.logo_url ?? "",
          tagline: data.settings.tagline ?? "",
          server_ip: data.settings.server_ip ?? "",
          alert_email: data.settings.alert_email ?? "",
          support_phone: data.settings.support_phone ?? "",
          website: data.settings.website ?? "",
          address: data.settings.address ?? "",
          timezone: data.settings.timezone ?? "Asia/Dhaka",
          log_retention_days: data.settings.log_retention_days ?? 90,
        });
      }
      if (data.lastBackup) setLastBackup(data.lastBackup);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  async function handleLogo(file: File | null) {
    if (!file || !file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) return;
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/company/logo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Upload failed");
      setForm((f) => ({ ...f, logo_url: data.url }));
      setMessage("Logo uploaded to ImageBB. Save settings to keep the URL.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Save failed");
      setMessage("Settings saved successfully");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    setMessage(null);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Backup failed");
      setLastBackup(data);
      setMessage(`Backup recorded: ${data.file_label}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setBackingUp(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-white">
        <Loader2 className="animate-spin text-[#1565C0]" size={24} />
      </div>
    );
  }

  const inputClass = "w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]";

  return (
    <div className="flex flex-col gap-3.5">
      {message && (
        <div className="rounded-lg bg-[#E8F5E9] px-3 py-2 text-[12px] text-[#2E7D32]">{message}</div>
      )}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-3 text-[12px] font-medium text-[#64748B]">Branding</div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="text-lg font-bold text-[#1565C0]">{form.company_name[0] ?? "C"}</span>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1 rounded-md bg-[#1976D2] px-3 py-1.5 text-[12px] text-white disabled:opacity-60">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {uploading ? "Uploading..." : "Upload to ImageBB"}
            </button>
            {form.logo_url && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, logo_url: "" }))} className="ml-2 text-[11px] text-[#64748B]">
                <Trash2 size={12} className="inline" /> Remove
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { key: "company_name", label: "Company name" },
            { key: "tagline", label: "Tagline" },
            { key: "alert_email", label: "Alert email" },
            { key: "support_phone", label: "Support phone" },
            { key: "website", label: "Website" },
            { key: "server_ip", label: "Server IP" },
            { key: "timezone", label: "Timezone" },
            { key: "log_retention_days", label: "Log retention (days)", type: "number" },
          ].map((f) => (
            <div key={f.key} className={f.key === "tagline" ? "sm:col-span-2" : ""}>
              <div className="mb-1 text-[12px] text-[#64748B]">{f.label}</div>
              <input
                type={f.type ?? "text"}
                value={String(form[f.key as keyof CompanySettings])}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <div className="mb-1 text-[12px] text-[#64748B]">Address</div>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-3 flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save settings
        </button>
      </div>
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-2.5 text-[12px] font-medium text-[#64748B]">Database backup</div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleBackup}
            disabled={backingUp}
            className="flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
          >
            {backingUp ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Backup now
          </button>
          <span className="text-[12px] text-[#64748B]">
            {lastBackup
              ? `Last backup: ${new Date(lastBackup.created_at).toLocaleString()} — ${lastBackup.size_mb} MB`
              : "No backups recorded yet"}
          </span>
        </div>
      </div>
    </div>
  );
}
