import React, { useEffect, useState } from "react";
import { AuditEntry, formatInr } from "@/lib/api";
import AuditInspectorDrawer from "./AuditInspectorDrawer";

interface Props {
  entries: AuditEntry[];
  onPaymentResolved: () => void;
  onSelectForChat?: (entry: AuditEntry) => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  recovered: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    dot: "bg-emerald-400",
  },
  in_progress: {
    bg: "bg-blue-500/15",
    text: "text-blue-300",
    border: "border-blue-500/40",
    dot: "bg-blue-400",
  },
  scheduled: {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/40",
    dot: "bg-amber-400",
  },
  escalated: {
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/40",
    dot: "bg-rose-400",
  },
  stopped: {
    bg: "bg-slate-500/20",
    text: "text-slate-300",
    border: "border-slate-500/40",
    dot: "bg-slate-400",
  },
  exhausted: {
    bg: "bg-purple-500/15",
    text: "text-purple-300",
    border: "border-purple-500/40",
    dot: "bg-purple-400",
  },
  customer_promised: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-300",
    border: "border-cyan-500/40",
    dot: "bg-cyan-400",
  },
};

export default function AuditTable({ entries, onPaymentResolved, onSelectForChat }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Debounce search input by 150ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const filtered = entries.filter((e) => {
    const matchesSearch =
      debouncedSearch === "" ||
      e.payment_id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.root_cause.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.action.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (e.customer_name_masked && e.customer_name_masked.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (e.bank_name && e.bank_name.toLowerCase().includes(debouncedSearch.toLowerCase()));

    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesMethod = methodFilter === "all" || e.payment_method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  function exportCSV() {
    const headers = [
      "Payment ID",
      "Customer",
      "Bank",
      "Amount INR",
      "Payment Method",
      "Root Cause",
      "Confidence",
      "Autonomous Action",
      "Status",
      "Compliance Tags",
    ];

    const rows = filtered.map((e) => [
      e.payment_id,
      e.customer_name_masked,
      e.bank_name || "HDFC Bank",
      (e.amount_paise / 100).toFixed(2),
      e.payment_method,
      e.root_cause,
      `${(e.confidence * 100).toFixed(0)}%`,
      e.action,
      e.status,
      (e.compliance_tags || []).join("; "),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `razorpay_recovery_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="glass-card rounded-2xl border border-border/80 overflow-hidden shadow-xl">
      {/* Table Header & Multi-Attribute Search Filter Bar */}
      <div className="p-5 border-b border-border/80 bg-[#0A101E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Autonomous Audit Ledger &amp; Regulatory Forensics</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rzp-blue/15 text-rzp-blue font-mono font-bold border border-rzp-blue/30">
              {filtered.length} of {entries.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time forensic log of all Gemini 2.5 Flash diagnoses, RBI guardrail checks, and recovery executions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search ID, Bank, Cause, Name…"
              className="bg-surface border border-border text-white text-xs rounded-xl pl-8 pr-3 py-2 outline-none w-52 focus:w-64 transition-all placeholder-slate-500 focus:border-rzp-blue"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface border border-border text-white text-xs rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-600 focus:border-rzp-blue"
          >
            <option value="all">All Statuses ({entries.length})</option>
            <option value="recovered">Recovered</option>
            <option value="in_progress">In Progress</option>
            <option value="scheduled">Smart Scheduled</option>
            <option value="escalated">Escalated to Ops</option>
            <option value="stopped">Compliance Stopped</option>
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-surface border border-border text-white text-xs rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-600 focus:border-rzp-blue"
          >
            <option value="all">All Payment Rails</option>
            <option value="upi_autopay">UPI AutoPay</option>
            <option value="credit_card">Credit Card (COFT)</option>
            <option value="debit_card">Debit Card</option>
            <option value="netbanking">NetBanking</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            className="text-xs px-3 py-2 rounded-xl bg-surface border border-border hover:bg-surface-raised text-slate-300 hover:text-white transition flex items-center gap-1.5 font-medium"
            title="Export filtered records to CSV"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#070C16] border-b border-border text-slate-400 font-bold uppercase tracking-wider text-[10px] z-10">
            <tr>
              <th className="py-3.5 px-4">Payment ID</th>
              <th className="py-3.5 px-4">Customer &amp; Bank</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">AI Diagnostic Cause</th>
              <th className="py-3.5 px-4">Autonomous Action</th>
              <th className="py-3.5 px-4">Attempts</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Guardrail Tags</th>
              <th className="py-3.5 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  No audit records match the current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const badge = STATUS_BADGES[e.status] || STATUS_BADGES.in_progress;
                const attempts = e.attempt_count || 0;
                const maxAttempts = e.max_attempts || 4;

                return (
                  <tr
                    key={e.id || e.payment_id}
                    onClick={() => setSelectedEntry(e)}
                    className="hover:bg-surface/60 transition-colors cursor-pointer group"
                  >
                    {/* Payment ID */}
                    <td className="py-3.5 px-4 mono text-rzp-blue font-semibold whitespace-nowrap group-hover:text-rzp-neon transition">
                      {e.payment_id}
                    </td>

                    {/* Customer & Bank (DPDP Masked) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-white font-medium flex items-center gap-1.5">
                        <span>{e.customer_name_masked}</span>
                        {e.customer_tier === "VIP" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="text-slate-300 font-medium">{e.bank_name || "HDFC Bank"}</span>
                        <span>•</span>
                        <span className="font-mono">{e.customer_phone_masked}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-white font-mono">
                      {formatInr(e.amount_paise)}
                    </td>

                    {/* Root Cause & Confidence */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-semibold capitalize">
                        {e.root_cause.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                        <span>✦ Conf: {(e.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-rzp-teal font-mono text-[11px] font-bold">
                        {e.action}
                      </span>
                      <div className="text-[10px] text-slate-400 capitalize">{e.payment_method.replace(/_/g, " ")}</div>
                    </td>

                    {/* Guardrail Attempts */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-300 bg-surface px-2 py-0.5 rounded-md border border-border">
                          {attempts}/{maxAttempts}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        <span>{e.status.replace(/_/g, " ")}</span>
                      </span>
                    </td>

                    {/* Compliance Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {e.compliance_tags?.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface border border-border text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Inspect CTA */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                      <button
                        onClick={() => setSelectedEntry(e)}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-rzp-blue text-slate-300 hover:text-white transition font-semibold text-xs shadow-sm"
                      >
                        Inspect ➔
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Inspection Drawer Component */}
      <AuditInspectorDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onOpenInChat={(entry) => {
          setSelectedEntry(null);
          if (onSelectForChat) {
            onSelectForChat(entry);
          }
        }}
        onPaymentResolved={() => {
          onPaymentResolved();
        }}
      />
    </div>
  );
}
