"use client";

import type { Plan } from "@isp/core/types";
import { CreditCard } from "lucide-react";

interface PlansOverviewProps {
  plans: Plan[];
}

export function PlansOverview({ plans }: PlansOverviewProps) {
  if (plans.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-[#111827]/60 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2">
        <CreditCard size={18} className="text-blue-400" />
        <h2 className="text-base font-semibold text-white">Subscription Plans</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-xl border border-white/10 bg-[#0B1220]/60 p-4"
          >
            <div className="text-sm font-semibold text-white">{plan.name}</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-lg font-bold text-blue-400">
                {plan.price_bdt ? `৳${plan.price_bdt.toLocaleString()}` : "Custom"}
              </div>
              {plan.is_featured && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-300">
                  Popular
                </span>
              )}
            </div>
            <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
              <li>{plan.max_users} users · {plan.max_devices} devices</li>
              <li>{plan.retention_days}d retention</li>
              <li>{plan.max_logs_per_day.toLocaleString()} logs/day</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
