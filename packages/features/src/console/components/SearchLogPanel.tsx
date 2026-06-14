"use client";

import { useState } from "react";
import type { LogEntry } from "@isp/core/types";
import { LogsTable } from "@isp/features/console/components/LogsTable";
import { logsFromTimeRange, useTenantContext } from "@isp/auth/hooks/useTenantContext";
import { Loader2 } from "lucide-react";

export function SearchLogPanel() {
  const { tenantId, tenants, setTenantId } = useTenantContext();
  const [query, setQuery] = useState("");
  const [mac, setMac] = useState("");
  const [range, setRange] = useState("24h");
  const [results, setResults] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [source, setSource] = useState("");

  async function doSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const { from, to } = logsFromTimeRange(range);
      const params = new URLSearchParams({ tenant_id: String(tenantId), limit: "100" });
      if (query.trim()) params.set("user", query.trim());
      if (mac.trim()) params.set("mac", mac.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/logs/search?${params}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data.logs ?? []);
        setSource(data.source ?? "");
      } else {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="mb-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-1 text-[12px] text-[#64748B]">PPPoE username / IP</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. clc05@sohel3"
            className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
          />
        </div>
        <div>
          <div className="mb-1 text-[12px] text-[#64748B]">MAC address</div>
          <input
            value={mac}
            onChange={(e) => setMac(e.target.value)}
            placeholder="e.g. CC:2D:..."
            className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
          />
        </div>
        <div>
          <div className="mb-1 text-[12px] text-[#64748B]">Database</div>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(Number(e.target.value))}
            className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.schema_name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-[12px] text-[#64748B]">Time range</div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-full rounded-md border border-[#E2E8F0] px-2.5 py-1.5 text-[12px]"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={doSearch}
          disabled={loading}
          className="flex items-center gap-1 rounded-md bg-[#1976D2] px-3.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Search
        </button>
        <button
          type="button"
          onClick={() => { setQuery(""); setMac(""); setResults([]); setSearched(false); }}
          className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-[12px]"
        >
          Clear
        </button>
      </div>
      {!searched ? (
        <div className="py-8 text-center text-[13px] text-[#64748B]">Enter criteria above to search logs</div>
      ) : loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#1565C0]" size={24} /></div>
      ) : results.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[#64748B]">No results found</div>
      ) : (
        <>
          <div className="mb-2 text-[12px] text-[#64748B]">
            Found {results.length} result(s) {source ? `· source: ${source}` : ""}
          </div>
          <LogsTable logs={results.slice(0, 50)} compact />
        </>
      )}
    </div>
  );
}
