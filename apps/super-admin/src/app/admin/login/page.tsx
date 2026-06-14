"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { SuperAdminLoginForm } from "@isp/features/auth/components/SuperAdminLoginForm";
import { Crown } from "lucide-react";

function LoginFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1a3c5e] via-[#0c4a6e] to-[#0f172a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(14,165,233,0.2),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12 lg:flex-row lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-10 max-w-md text-center text-white lg:mb-0 lg:text-left"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
            <Crown size={14} /> Restricted Zone
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Super Admin Portal</h1>
          <p className="mt-4 text-blue-100/90">
            Manage all tenants, billing plans, analytics configuration, and platform settings from one secure control plane.
          </p>
          <p className="mt-4 text-xs text-blue-300/70">
            Authorized personnel only. This portal is not linked from the public website.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <Suspense fallback={<LoginFallback />}>
            <SuperAdminLoginForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
