"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, Phone, Send, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiUrl } from "@isp/core/utils/portal-api.utils";

type DemoRequestModalProps = {
  open: boolean;
  onClose: () => void;
  defaultPlan?: string;
  title?: string;
  subtitle?: string;
};

const PLANS = ["Starter", "Pro", "Business", "Enterprise", "Not sure yet"];

export function DemoRequestModal({
  open,
  onClose,
  defaultPlan = "",
  title = "Request a Live Demo",
  subtitle = "Fill in your details and our team will schedule a walkthrough within 24 hours.",
}: DemoRequestModalProps) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    phone: "",
    plan_interest: defaultPlan,
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, plan_interest: defaultPlan || f.plan_interest }));
    setError("");
    setSuccess(false);
  }, [open, defaultPlan]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/demo-request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "landing" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? data.detail ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setSuccess(false);
      setForm({ full_name: "", email: "", company: "", phone: "", plan_interest: "", message: "" });
    }, 300);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={handleClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="border-b border-slate-100 bg-blue-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                    ISP LogServer
                  </p>
                  <h2 id="demo-modal-title" className="text-xl font-black text-slate-900">
                    {success ? "Request received!" : title}
                  </h2>
                  {!success && (
                    <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-white hover:text-blue-600"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-4 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <CheckCircle2 size={32} className="text-blue-600" />
                  </div>
                  <p className="text-[15px] font-semibold text-slate-800">
                    Thank you, {form.full_name.split(" ")[0]}!
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500">
                    We&apos;ve saved your request. Our sales team will reach you at{" "}
                    <span className="font-medium text-blue-600">{form.email}</span> within one business day.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-6 w-full rounded-xl bg-blue-600 py-3.5 text-[14px] font-bold text-white hover:bg-blue-700"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                      Full name *
                    </label>
                    <div className="relative">
                      <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        minLength={2}
                        value={form.full_name}
                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                        placeholder="Karim Ahmed"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                      Work email *
                    </label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="you@yourisp.com"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                      Company / ISP name *
                    </label>
                    <input
                      required
                      minLength={2}
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Cyber Link Communication"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="+880 1XXX XXXXXX"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                        Plan interest
                      </label>
                      <select
                        value={form.plan_interest}
                        onChange={(e) => setForm((f) => ({ ...f, plan_interest: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="">Select a plan</option>
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us about your network size, MikroTik setup, or BTRC requirements..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-700">
                      {error}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: submitting ? 1 : 1.02 }}
                    whileTap={{ scale: submitting ? 1 : 0.98 }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Submit Demo Request
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
