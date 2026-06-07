"use client";

import { useCallback, useEffect, useState } from "react";
import { MetricCard, PanelCard } from "@/components/dashboard/MetricCard";
import { Tag } from "@/components/shared/Tag";
import type { BtrcConfig, BtrcSubmission } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";

interface BtrcStatusResponse {
  status: {
    compliant: boolean;
    retention_days: number;
    retention_required: number;
    logs_ready: number;
    logs_pending_export: number;
    last_submission: string | null;
    last_submission_status: string | null;
    next_auto_submit: string | null;
    auto_submit_enabled: boolean;
  };
  submissions: BtrcSubmission[];
}

export function BtrcPanel() {
  const [config, setConfig] = useState<BtrcConfig | null>(null);
  const [statusData, setStatusData] = useState<BtrcStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, statusRes] = await Promise.all([
        fetch("/api/btrc/config"),
        fetch("/api/btrc/status"),
      ]);
      const cfg = await cfgRes.json();
      const status = await statusRes.json();
      setConfig(cfg);
      setStatusData(status);
      if (!dateFrom) setDateFrom(weekAgo);
      if (!dateTo) setDateTo(today);
    } catch {
      setMessage({ type: "err", text: "Failed to load BTRC data" });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, today, weekAgo]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/btrc/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json();
      setConfig(saved);
      setMessage({ type: "ok", text: "BTRC configuration saved" });
    } catch {
      setMessage({ type: "err", text: "Could not save configuration" });
    } finally {
      setSaving(false);
    }
  }

  async function submitToBtrc() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/btrc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: dateFrom, to: dateTo, limit: 500 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setMessage({
        type: "ok",
        text: `${data.simulated ? "[Demo mode] " : ""}${data.message} — Batch ${data.batch_id} (${data.record_count} records)`,
      });
      load();
    } catch (e) {
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function downloadExport(format: "csv" | "json") {
    const params = new URLSearchParams({
      format,
      from: dateFrom,
      to: dateTo,
      limit: "500",
    });
    window.open(`/api/btrc/export?${params}`, "_blank");
  }

  if (loading || !config || !statusData) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={24} className="animate-spin text-[#1565C0]" />
      </div>
    );
  }

  const { status, submissions } = statusData;

  return (
    <div className="flex flex-col gap-4">
      {/* Compliance banner */}
      <div
        className={`flex items-start gap-4 rounded-2xl border p-5 ${
          status.compliant
            ? "border-[#A5D6A7] bg-gradient-to-r from-[#E8F5E9] to-[#F1F8E9]"
            : "border-[#FFE082] bg-gradient-to-r from-[#FFF8E1] to-[#FFFDE7]"
        }`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            status.compliant ? "bg-[#2E7D32] text-white" : "bg-[#E65100] text-white"
          }`}
        >
          {status.compliant ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-[#0F172A]">
            BTRC Compliance — {status.compliant ? "Ready for submission" : "Action required"}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[#475569]">
            Bangladesh Telecommunication Regulatory Commission (BTRC) requires ISPs to maintain NAT
            session logs for minimum {status.retention_required} days and submit subscriber traceability
            data. Your logs are formatted per BTRC standard fields.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tag variant={status.retention_days >= status.retention_required ? "ok" : "warn"}>
              Retention: {status.retention_days} days
            </Tag>
            <Tag variant="ok">{status.logs_pending_export.toLocaleString()} logs exportable</Tag>
            {status.last_submission && (
              <Tag variant="inf">
                Last submit: {new Date(status.last_submission).toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}
              </Tag>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border border-[#A5D6A7] bg-[#E8F5E9] text-[#2E7D32]"
              : "border border-[#EF9A9A] bg-[#FFEBEE] text-[#C62828]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Logs ready for BTRC"
          value={status.logs_ready}
          sub="within retention period"
          color="blue"
          icon={Upload}
        />
        <MetricCard
          label="Retention policy"
          value={`${status.retention_days}d`}
          sub={`BTRC min: ${status.retention_required}d`}
          color={status.retention_days >= status.retention_required ? "green" : "amber"}
          icon={Clock}
        />
        <MetricCard
          label="Pending export"
          value={status.logs_pending_export}
          sub="not yet submitted"
          color="purple"
          icon={Send}
        />
        <MetricCard
          label="Auto submit"
          value={status.auto_submit_enabled ? "ON" : "OFF"}
          sub={status.next_auto_submit ? `Next: ${new Date(status.next_auto_submit).toLocaleDateString()}` : "Manual mode"}
          color="teal"
          icon={RefreshCw}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Export & Submit */}
        <PanelCard title="Export & Submit to BTRC">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#64748B]">From date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#64748B]">To date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
          </div>

          <div className="mb-4 rounded-xl bg-[#F8FAFC] p-3 text-[11px] leading-relaxed text-[#64748B] ring-1 ring-[#E2E8F0]">
            <strong className="text-[#475569]">BTRC export fields:</strong> ISP License, ISP Name,
            Timestamp (Asia/Dhaka), Subscriber ID, MAC, Private IP, Public IP, Public Port, Dest IP,
            Dest Port, Protocol, Session ID
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadExport("csv")}
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[12px] font-medium text-[#475569] shadow-sm hover:bg-[#F8FAFC]"
            >
              <Download size={14} />
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => downloadExport("json")}
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[12px] font-medium text-[#475569] shadow-sm hover:bg-[#F8FAFC]"
            >
              <FileJson size={14} />
              Download JSON
            </button>
            <button
              type="button"
              onClick={submitToBtrc}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1565C0] to-[#1976D2] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-blue-600/20 disabled:opacity-60"
            >
              <Send size={14} />
              {submitting ? "Submitting..." : "Submit to BTRC Portal"}
            </button>
          </div>
          {!config.api_url && (
            <p className="mt-3 text-[11px] text-[#E65100]">
              BTRC API URL not configured — submissions run in demo/simulation mode. Set{" "}
              <code className="rounded bg-[#FFF8E1] px-1">BTRC_API_URL</code> in .env.local
            </p>
          )}
        </PanelCard>

        {/* ISP Configuration */}
        <PanelCard title="BTRC ISP Configuration">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#64748B]">ISP License Number (BTRC)</label>
              <input
                value={config.isp_license}
                onChange={(e) => setConfig({ ...config, isp_license: e.target.value })}
                placeholder="ISP-BD-XXXX-XXXX"
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#64748B]">ISP Name</label>
              <input
                value={config.isp_name}
                onChange={(e) => setConfig({ ...config, isp_name: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#64748B]">BTRC API Endpoint URL</label>
              <input
                value={config.api_url}
                onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                placeholder="https://btrc-portal.gov.bd/api/nat-logs"
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#64748B]">Log retention (days)</label>
                <input
                  type="number"
                  min={180}
                  value={config.retention_days}
                  onChange={(e) => setConfig({ ...config, retention_days: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#64748B]">Submit interval (hours)</label>
                <input
                  type="number"
                  min={1}
                  value={config.submit_interval_hours}
                  onChange={(e) => setConfig({ ...config, submit_interval_hours: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#64748B]">Compliance contact email</label>
              <input
                type="email"
                value={config.contact_email}
                onChange={(e) => setConfig({ ...config, contact_email: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-[13px]"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-[#475569]">
              <input
                type="checkbox"
                checked={config.auto_submit}
                onChange={(e) => setConfig({ ...config, auto_submit: e.target.checked })}
                className="rounded"
              />
              Enable automatic BTRC submission (scheduled)
            </label>
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save BTRC Settings"}
            </button>
          </div>
        </PanelCard>
      </div>

      {/* Submission history */}
      <PanelCard title="BTRC Submission History">
        {submissions.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[#64748B]">
            No submissions yet. Export or submit logs to BTRC to see history here.
          </div>
        ) : (
          <div className="dashboard-scroll max-h-[280px] overflow-y-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-[11px] font-medium text-[#64748B]">
                  {["Batch ID", "Records", "Period", "Status", "Submitted", "Message"].map((h) => (
                    <th key={h} className="border-b border-[#E2E8F0] px-2.5 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.batch_id} className="hover:bg-[#F8FAFC]">
                    <td className="mono border-b border-[#E2E8F0] px-2.5 py-2">{s.batch_id}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">{s.record_count}</td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2 text-[11px]">
                      {new Date(s.period_from).toLocaleDateString()} –{" "}
                      {new Date(s.period_to).toLocaleDateString()}
                    </td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2">
                      <Tag
                        variant={
                          s.status === "success" || s.status === "simulated"
                            ? "ok"
                            : s.status === "failed"
                              ? "off"
                              : "warn"
                        }
                      >
                        {s.status === "simulated" ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={10} /> simulated
                          </span>
                        ) : (
                          s.status
                        )}
                      </Tag>
                    </td>
                    <td className="border-b border-[#E2E8F0] px-2.5 py-2 text-[11px]">
                      {new Date(s.submitted_at).toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}
                    </td>
                    <td className="max-w-[200px] truncate border-b border-[#E2E8F0] px-2.5 py-2 text-[11px] text-[#64748B]">
                      {s.response_message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
