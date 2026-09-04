import React, { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRunBatch?: () => void;
}

export default function SystemTourModal({ isOpen, onClose, onRunBatch }: Props) {
  const [activeSection, setActiveSection] = useState<"overview" | "pillars" | "funnel" | "glossary">("overview");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#090F1C] border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rzp-blue via-rzp-indigo to-rzp-teal p-0.5 flex items-center justify-center shadow-lg shadow-rzp-blue/20">
              <div className="w-full h-full bg-[#090F1C] rounded-[10px] flex items-center justify-center text-sm font-bold text-rzp-blue">
                ✦
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Razorpay Recovery Agent 2.0 <span className="text-xs px-2 py-0.5 rounded-full bg-rzp-blue/20 text-rzp-blue font-mono font-medium">Concept & Architecture Guide</span>
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous Revenue Recovery powered by Google Gemini 2.5 Flash &amp; RBI/NPCI deterministic guardrails.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-6 py-2 bg-surface/60 border-b border-border/60 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Executive Summary", icon: "🚀" },
            { id: "pillars", label: "The 3 AI Pillars", icon: "🏛️" },
            { id: "funnel", label: "5-Stage Pipeline", icon: "⚡" },
            { id: "glossary", label: "Metrics & Terms Glossary", icon: "📖" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                activeSection === tab.id
                  ? "bg-rzp-blue text-white shadow-md shadow-rzp-blue/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* SECTION 1: OVERVIEW */}
          {activeSection === "overview" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-emerald-950/40 border border-rzp-blue/30">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span>💡 The Problem with Traditional Payment Retries</span>
                </h3>
                <p className="leading-relaxed text-slate-300">
                  When subscription and invoice payments fail in India (e.g. across UPI AutoPay, RBI Tokenized Cards, or NetBanking), traditional payment systems execute <strong>blind 24-hour cron retries</strong>. This standard approach yields only <strong>~15% recovery</strong>, burns merchant trust, triggers bank penalty fees, and risks regulatory non-compliance when attempting retries on revoked mandates.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface border border-border">
                  <div className="text-2xl mb-1">❌</div>
                  <h4 className="font-bold text-white text-sm mb-1">Traditional Blind Retry</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Treats all 15+ failure codes the same. Retries blindly at 2 AM, ignores salary cycles, and violates TRAI quiet hours.
                  </p>
                  <div className="mt-3 text-rose-400 font-bold font-mono text-[11px]">~15% Recovery Rate</div>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-border">
                  <div className="text-2xl mb-1">🧠</div>
                  <h4 className="font-bold text-white text-sm mb-1">Gemini 2.5 Flash Diagnosis</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Analyzes error telemetry, bank switch status, and customer tier in &lt;140ms to prescribe the exact optimal recovery channel.
                  </p>
                  <div className="mt-3 text-rzp-blue font-bold font-mono text-[11px]">100% Root-Cause Classified</div>
                </div>

                <div className="p-4 rounded-xl bg-surface border border-emerald-500/30 bg-emerald-950/10">
                  <div className="text-2xl mb-1">⚡</div>
                  <h4 className="font-bold text-white text-sm mb-1">Autonomous Recovery</h4>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Dynamic 1-click Razorpay links, salary-day boosts, and 2-way conversational WhatsApp recovery with churn discounts.
                  </p>
                  <div className="mt-3 text-emerald-400 font-bold font-mono text-[11px]">44%+ Net Recovery (+3.2x Lift)</div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: THE 3 AI PILLARS */}
          {activeSection === "pillars" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    Pillar 1: Multi-Factor AI Diagnostic Core (Gemini 2.5 Flash)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    &lt;140ms Inference
                  </span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Classifies cryptic bank switch codes into 15 normalized categories (e.g. <em>Insufficient Funds</em> vs <em>COFT Token Expired</em> vs <em>UPI Pin Limit</em> vs <em>NetBanking Switch Degradation</em> vs <em>Suspected Fraud</em>). Generates structured evidence and confidence scores.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    Pillar 2: Deterministic Regulatory Guardrails (RBI / NPCI / TRAI / DPDP)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Zero-Hallucination Policy
                  </span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Enforces non-negotiable Indian financial regulations: <strong>RBI Hard Stop</strong> on revoked mandates (no retries permitted), <strong>NPCI 24h spacing</strong> between UPI presentations, <strong>TRAI Quiet Hours</strong> (no messages between 9 PM and 8 AM IST), and <strong>DPDP Act PII Masking</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    Pillar 3: Omnichannel Autonomous Execution
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Multi-Rail Dispatch
                  </span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  Dispatches tailored recovery paths: <strong>Dynamic 1-Click Razorpay Payment Links</strong> for expired cards, <strong>Smart Scheduled Retries</strong> aligned with 1st-of-month salary credits, and <strong>2-Way WhatsApp Conversational Recovery</strong> supporting 8 Indian languages with dynamic VIP churn discounts.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: 5-STAGE PIPELINE */}
          {activeSection === "funnel" && (
            <div className="space-y-3">
              {[
                {
                  num: "1",
                  title: "Detect & Ingest",
                  badge: "Real-Time / Batch",
                  color: "border-blue-500/40 text-blue-400",
                  desc: "Ingests failed payments across UPI AutoPay, Credit/Debit Cards, NetBanking, and Wallets via webhook or batch stream.",
                },
                {
                  num: "2",
                  title: "Gemini 2.5 Flash Diagnosis",
                  badge: "Root-Cause Intelligence",
                  color: "border-purple-500/40 text-purple-400",
                  desc: "Evaluates raw error codes, issuer bank switch health, customer retry history, and generates chain-of-thought rationale.",
                },
                {
                  num: "3",
                  title: "Regulatory Guardrail Enforcement",
                  badge: "Deterministic YAML Policy",
                  color: "border-amber-500/40 text-amber-400",
                  desc: "Applies NPCI 24h spacing, TRAI quiet hours queuing, DPDP PII redaction, and halts execution on revoked mandates or suspected fraud.",
                },
                {
                  num: "4",
                  title: "Multi-Rail Recovery Dispatch",
                  badge: "Autonomous Execution",
                  color: "border-cyan-500/40 text-cyan-400",
                  desc: "Generates 1-click payment links, schedules retries at optimal bank clearing windows, and activates conversational WhatsApp agents.",
                },
                {
                  num: "5",
                  title: "Captured & Settled",
                  badge: "Direct Cashflow",
                  color: "border-emerald-500/40 text-emerald-400",
                  desc: "Payment captured into Razorpay Merchant Balance. Audit ledger updated with sub-second forensics trail.",
                },
              ].map((step) => (
                <div key={step.num} className={`p-3.5 rounded-xl bg-surface border ${step.color} flex items-start gap-3`}>
                  <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border flex items-center justify-center font-bold text-white font-mono text-sm shrink-0">
                    {step.num}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white">{step.title}</h4>
                      <span className="text-[10px] font-mono uppercase opacity-80">{step.badge}</span>
                    </div>
                    <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION 4: METRICS GLOSSARY */}
          {activeSection === "glossary" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  term: "Total Revenue At Risk",
                  definition: "The gross sum of all failed subscription invoices and transactions ingested into the engine.",
                  formula: "Sum(amount_paise) of all failed records",
                },
                {
                  term: "Revenue Recovered",
                  definition: "Total funds successfully captured and settled to the merchant balance through AI-orchestrated actions.",
                  formula: "Sum(amount_recovered_paise) for records in RECOVERED status",
                },
                {
                  term: "Net Financial Lift",
                  definition: "The additional revenue generated by the AI Recovery Agent over traditional blind 24h retries (15% benchmark).",
                  formula: "Recovered INR - (At-Risk INR × 15% Naive Baseline)",
                },
                {
                  term: "Estimated ROI Multiple",
                  definition: "The multiplier of recovered revenue versus naive baseline, typically 3.0x to 4.5x for Indian merchant portfolios.",
                  formula: "Recovered INR ÷ Naive Benchmark INR",
                },
                {
                  term: "COFT Tokenization",
                  definition: "Card-on-File Tokenization mandated by RBI. When tokens expire, the agent generates 1-click re-consent links.",
                  formula: "RBI DPSS.CO.PD No.683/02.14.003/2021-22",
                },
                {
                  term: "TRAI Quiet Hours Spacing",
                  definition: "Telecom regulations prohibit promotional/recovery messages between 9 PM and 8 AM. Outreaches are queued for 8:15 AM.",
                  formula: "TRAI TCCCPR Regulations 2018",
                },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <h4 className="font-bold text-white text-xs text-rzp-blue">{item.term}</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{item.definition}</p>
                  <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-border/40">
                    {item.formula}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-border/80 bg-surface-raised flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Click anywhere outside or press Esc to return to dashboard.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-slate-300 text-xs font-semibold hover:bg-surface-raised"
            >
              Close
            </button>
            {onRunBatch && (
              <button
                onClick={() => {
                  onClose();
                  onRunBatch();
                }}
                className="px-5 py-2 rounded-lg rzp-glow-btn text-white text-xs font-bold transition shadow-lg"
              >
                Run Batch of 60 Records ➔
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
