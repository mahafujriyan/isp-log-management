"use client";

import { useEffect, useState } from "react";
import { OperatorStatCard } from "@/components/operator/OperatorPortalLayout";
import Link from "next/link";
import { PORTAL_ROUTES } from "@/constants/portal.constants";
import { useRole } from "@/hooks/useRole";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const QUICK_LINKS = [
  { href: PORTAL_ROUTES.operator.logs, title: "Log Stream", desc: "Live NAT/PPPoE entries from your tenant" },
  { href: PORTAL_ROUTES.operator.users, title: "User Manager", desc: "Team accounts and role assignments" },
  { href: PORTAL_ROUTES.operator.reports, title: "Analytics Reports", desc: "MikroTik metrics and dynamic charts" },
  { href: PORTAL_ROUTES.operator.settings, title: "Account Settings", desc: "Company name, logo, contact & system prefs" },
  { href: PORTAL_ROUTES.operator.legacyDashboard, title: "Full Console", desc: "Complete dashboard with all admin tools" },
];

export default function OperatorHomePage() {
  const { tenantId } = useRole();
  const [metrics, setMetrics] = useState({ totalLogs: 0, activeUsers: 0, devices: 0 });

  useEffect(() => {
    const query = tenantId ? `?tenant_id=${tenantId}` : "";
    fetch(`/api/dashboard/metrics${query}`)
      .then((r) => r.json())
      .then((m) => setMetrics({ totalLogs: m.totalLogs ?? 0, activeUsers: m.activeUsers ?? 0, devices: m.devices ?? 0 }))
      .catch(() => {});
  }, [tenantId]);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OperatorStatCard title="Logs Today"    value={metrics.totalLogs.toLocaleString()} color="bg-[#1565c0]" />
        <OperatorStatCard title="Active Users"  value={metrics.activeUsers.toLocaleString()} color="bg-[#1976d2]" />
        <OperatorStatCard title="Devices Online" value={metrics.devices} color="bg-[#0d47a1]" />
        <OperatorStatCard title="Uptime"        value="99.98%" color="bg-[#1e3a5f]" />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {QUICK_LINKS.map((card) => (
          <Link key={card.href} href={card.href}
            className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-500/20 hover:bg-white/[0.045]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white/80">{card.title}</h3>
                <p className="mt-1 text-sm text-white/35">{card.desc}</p>
              </div>
              <ArrowRight size={18} className="text-white/20 transition group-hover:translate-x-1 group-hover:text-blue-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
