import React from "react";
import { HealthInfo } from "@/lib/api";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: HealthInfo | null;
  loading: boolean;
  onRunBatch: () => void;
  onReset: () => void;
  onOpenRules: () => void;
  onOpenTour: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  health,
  loading,
  onRunBatch,
  onReset,
  onOpenRules,
  onOpenTour,
}: Props) {
  const tabs = [
    { id: "overview", label: "Operations & Analytics", icon: "📊", desc: "Live KPI & Pipeline" },
    { id: "whatsapp", label: "WhatsApp AI Sandbox", icon: "💬", desc: "Omnichannel 2-Way" },
    { id: "scenarios", label: "Stress Test Lab", icon: "⚡", desc: "Outages & Injector" },
    { id: "audit", label: "Audit Ledger & Forensics", icon: "📋", desc: "Regulatory Logs" },
    { id: "roi", label: "Merchant ROI & Churn", icon: "💰", desc: "Financial Modeling" },
    { id: "compliance", label: "Regulatory Guardrails", icon: "🛡️", desc: "RBI & NPCI Policies" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[#060A12]/95 backdrop-blur-xl transition-all">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand Identity & Engine Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rzp-blue via-rzp-indigo to-rzp-teal p-0.5 shadow-lg shadow-rzp-blue/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#080E1B] rounded-[14px] flex items-center justify-center">
              <svg className="w-6 h-6 text-rzp-blue animate-pulse-glow" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5 2L3 14h7v8l10.5-12h-7V2z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                AI <span className="rzp-gradient-text">Recovery Agent 2.0</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-rzp-blue/15 text-rzp-blue border border-rzp-blue/30 shadow-sm">
                FINANCIAL AI
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Artificial Intelligence</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-mono text-[11px]">&lt;140ms Latency</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 hidden sm:inline">RBI · NPCI · TRAI · DPDP Verified</span>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Concept Guide Button */}
          <button
            onClick={onOpenTour}
            className="text-xs px-3 py-2 rounded-xl border border-rzp-blue/30 bg-rzp-blue/10 hover:bg-rzp-blue/20 text-rzp-blue transition flex items-center gap-1.5 font-semibold"
            title="Open Interactive System Guide & Architecture Tour"
          >
            <span className="text-sm">💡</span>
            <span>How it Works</span>
          </button>

          {/* Rules Modal Button */}
          <button
            onClick={onOpenRules}
            className="text-xs px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-raised text-slate-300 transition flex items-center gap-1.5 font-medium"
            title="Inspect & edit decision policy YAML rules"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Playbook Policy</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={loading}
            className="text-xs px-3 py-2 rounded-xl border border-border/80 bg-surface hover:bg-surface-raised text-slate-400 hover:text-white transition disabled:opacity-50 font-medium"
            title="Wipe audit records for a clean run"
          >
            Reset
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onRunBatch}
            disabled={loading}
            className="text-xs font-bold px-4 py-2 rounded-xl rzp-glow-btn text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-rzp-blue/25 whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Processing 60 Payments…</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Run Batch (60 Records)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Categorized Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar gap-1 border-t border-border/40 py-1">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                active
                  ? "bg-gradient-to-r from-rzp-blue/20 to-rzp-teal/10 border border-rzp-blue/40 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface/50 border border-transparent"
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              <div className="text-left">
                <div className={active ? "text-rzp-neon font-bold" : ""}>{t.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </header>
  );
}
