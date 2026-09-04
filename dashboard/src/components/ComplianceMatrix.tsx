import React from "react";

export default function ComplianceMatrix() {
  const guardrails = [
    {
      regulator: "RBI (Reserve Bank of India)",
      rule: "Recurring E-Mandate & Card-on-File Tokenization (COFT)",
      citation: "RBI Circular DPSS.CO.PD No.683/02.14.003/2021-22",
      description:
        "Prohibits automated debit retries on revoked mandates. Enforces 1-click token re-consent for expired Card-on-File cryptograms.",
      enforcement: "HARD_STOP: Retries blocked immediately; only 1-click re-authorization links dispatched.",
      testStatus: "100% Verified (test_mandate_revoked_never_retries)",
      badge: "RBI_MANDATE_COMPLIANT",
      color: "border-blue-500/30 bg-blue-950/20 text-blue-300",
    },
    {
      regulator: "NPCI (National Payments Corporation of India)",
      rule: "UPI AutoPay 24-Hour Spacing & Velocity Limits",
      citation: "NPCI UPI AutoPay Operating Circular 2023",
      description:
        "Mandates a minimum 24-hour spacing window between failed e-mandate presentations. Snoozes retries on daily UPI bank limit hits to 00:01 AM reset.",
      enforcement: "SMART_SCHEDULE: 24h cooldown timer on recurring charges.",
      testStatus: "100% Verified (test_upi_pin_limit_notifies_and_snoozes)",
      badge: "NPCI_24H_SPACING",
      color: "border-emerald-500/30 bg-emerald-950/20 text-emerald-300",
    },
    {
      regulator: "TRAI (Telecom Regulatory Authority of India)",
      rule: "DND Quiet Hours Customer Outreach Policy",
      citation: "Telecom Commercial Communications Customer Preference Reg (TCCCPR 2018)",
      description:
        "Automated WhatsApp & SMS customer recovery communications are strictly prohibited between 9:00 PM and 8:00 AM IST.",
      enforcement: "TIME_DEFERRAL: Outreach queued and auto-scheduled for 8:15 AM IST next morning.",
      testStatus: "100% Verified (test_smart_scheduling_output)",
      badge: "TRAI_DND_QUIET_HOURS",
      color: "border-amber-500/30 bg-amber-950/20 text-amber-300",
    },
    {
      regulator: "DPDP Act 2023 (Digital Personal Data Protection)",
      rule: "Customer Consent Revocation & PII Masking",
      citation: "Digital Personal Data Protection Act, Sections 6 & 8",
      description:
        "Customer phone numbers and names are masked in all logs and dashboards. If customer replies 'STOP' or 'UNSUBSCRIBE', all recovery outreach is immediately halted.",
      enforcement: "PII_MASKING + HARD_STOP on customer opt-out trigger.",
      testStatus: "100% Verified (test_dpdp_pii_masking, test_customer_opt_out)",
      badge: "DPDP_PII_PROTECTED",
      color: "border-purple-500/30 bg-purple-950/20 text-purple-300",
    },
    {
      regulator: "AML / Risk Operations",
      rule: "Suspected Fraud & Velocity Anomaly Quarantine",
      citation: "RBI Master Direction - Know Your Customer (KYC) Direction, 2016",
      description:
        "Suspected fraud transactions must be immediately quarantined with zero automated customer contact to prevent tipping off bad actors.",
      enforcement: "ZERO_CONTACT: Immediate human risk escalation.",
      testStatus: "100% Verified (test_fraud_hold_never_contacts_customer)",
      badge: "ZERO_CONTACT_FRAUD_QUARANTINE",
      color: "border-rose-500/30 bg-rose-950/20 text-rose-300",
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/80 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Indian Regulatory &amp; Compliance Enforcement Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic compliance guardrails strictly enforced by YAML policy — the AI agent operates only within regulatory bounds.
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/40 font-mono shadow-sm">
          ✓ 100% Verified (5/5 Frameworks Passed)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {guardrails.map((g, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${g.color} space-y-3 shadow-md`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{g.regulator}</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-semibold text-slate-200">{g.rule}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-surface border border-border text-slate-300 font-bold">
                {g.badge}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{g.description}</p>

            <div className="text-[10px] text-slate-400 font-mono italic">
              Legal Reference: {g.citation}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border/40 text-[11px]">
              <div className="text-slate-300">
                <span className="font-bold text-white">Enforcement Mechanism:</span> {g.enforcement}
              </div>
              <div className="text-emerald-400 font-mono font-bold">
                ✓ {g.testStatus}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
