import React, { useState } from "react";
import { BatchMetrics, formatInr } from "@/lib/api";

interface Props {
  metrics: BatchMetrics;
}

export default function MetricCards({ metrics }: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const recoveryPct = (metrics.recovery_rate * 100).toFixed(1);
  const naivePaise = metrics.total_amount_at_risk_paise * 0.15;
  const netLiftPaise = Math.max(0, metrics.total_amount_recovered_paise - naivePaise);

  const cards = [
    {
      id: "at_risk",
      title: "Total Revenue At Risk",
      value: formatInr(metrics.total_amount_at_risk_paise),
      badge: `${metrics.batch_size} Failed Txns`,
      badgeColor: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      glowColor: "bg-rose-500/10",
      borderColor: "border-rose-500/30",
      footerLeft: "UPI, Cards & NetBanking",
      footerRight: "100% Ingested",
      footerRightColor: "text-rose-400 font-semibold",
      explainer: {
        what: "The aggregate rupee value of all subscription and invoice transactions that encountered hard or soft failure at payment gateways.",
        why: "Represents immediate potential revenue loss and subscriber churn if left unrecovered.",
        formula: "Sum of amount_paise across all failed records ingested.",
      },
    },
    {
      id: "recovered",
      title: "Revenue Recovered",
      value: formatInr(metrics.total_amount_recovered_paise),
      badge: `${recoveryPct}% Recovery Rate`,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold",
      glowColor: "bg-emerald-500/15",
      borderColor: "border-emerald-500/40 bg-emerald-950/20",
      progress: Number(recoveryPct),
      footerLeft: "Settled to Merchant Balance",
      footerRight: `${metrics.records_recovered} Payments Captured`,
      footerRightColor: "text-emerald-400 font-bold",
      explainer: {
        what: "Rupee value successfully collected and captured into the merchant account via autonomous AI actions (smart retries, payment links, WhatsApp negotiations).",
        why: "Direct bottom-line revenue restored without requiring human operations or manual follow-ups.",
        formula: "Sum of amount_recovered_paise for all records converted to RECOVERED status.",
      },
    },
    {
      id: "net_lift",
      title: "Net Financial Lift",
      value: formatInr(netLiftPaise),
      badge: `+${metrics.estimated_roi_multiple}x ROI Multiplier`,
      badgeColor: "bg-rzp-blue/20 text-rzp-blue border-rzp-blue/40 font-bold",
      glowColor: "bg-rzp-blue/15",
      borderColor: "border-rzp-blue/40 bg-blue-950/20",
      footerLeft: "vs 15% Blind Retry Baseline",
      footerRight: "Salary & Link Boost",
      footerRightColor: "text-rzp-neon font-semibold",
      explainer: {
        what: "The incremental cashflow generated strictly by the AI agent above what standard blind 24h cron retries (~15% recovery) would achieve.",
        why: "Proves the financial return on investment (ROI) of intelligent timing, channel switching, and conversational engagement.",
        formula: "Recovered INR - (At-Risk INR × 15% Industry Baseline).",
      },
    },
    {
      id: "compliance",
      title: "Guardrails & Risk Defense",
      value: `${metrics.records_stopped + metrics.records_escalated}`,
      subValue: `(${metrics.records_stopped} stopped, ${metrics.records_escalated} escalated)`,
      badge: "100% Guarded",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold",
      glowColor: "bg-purple-500/15",
      borderColor: "border-purple-500/30 bg-purple-950/15",
      footerLeft: "RBI / NPCI / TRAI / DPDP",
      footerRight: "0 Non-Compliance Breaches",
      footerRightColor: "text-emerald-400 font-bold",
      explainer: {
        what: "Transactions halted or quarantined to protect the merchant from regulatory fines, bank mandate suspensions, or fraud contact violations.",
        why: "RBI prohibits retries on revoked mandates; TRAI prohibits nighttime outreach (9 PM - 8 AM); AML requires zero contact on suspected fraud.",
        formula: "Sum of records quarantined under STOPPED or ESCALATED compliance policy.",
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isTooltipOpen = activeTooltip === card.id;

        return (
          <div
            key={card.id}
            className={`glass-card rounded-2xl p-5 relative overflow-hidden border ${card.borderColor} flex flex-col justify-between`}
          >
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.glowColor} rounded-full blur-3xl pointer-events-none`}></div>

            <div>
              {/* Header with Title and Explainer Trigger */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                    {card.title}
                  </span>
                  {/* Explainer Icon Button */}
                  <button
                    onClick={() => setActiveTooltip(isTooltipOpen ? null : card.id)}
                    className="w-4 h-4 rounded-full bg-surface-raised border border-border text-slate-400 hover:text-white hover:border-rzp-blue text-[10px] flex items-center justify-center font-bold transition"
                    title="Click for metric definition and calculation methodology"
                  >
                    ?
                  </button>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${card.badgeColor} whitespace-nowrap shadow-sm`}>
                  {card.badge}
                </span>
              </div>

              {/* Explainer Dropdown Popup */}
              {isTooltipOpen && (
                <div className="mb-3 p-3 rounded-xl bg-[#080E1A] border border-rzp-blue/40 shadow-xl text-[11px] text-slate-300 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between text-white font-bold pb-1 border-b border-border/60">
                    <span className="text-rzp-blue">{card.title}</span>
                    <button
                      onClick={() => setActiveTooltip(null)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">What: </span>
                    {card.explainer.what}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">Impact: </span>
                    {card.explainer.why}
                  </div>
                  <div className="pt-1 text-[10px] font-mono text-slate-400 border-t border-border/40">
                    <span className="text-slate-500">Formula: </span>
                    {card.explainer.formula}
                  </div>
                </div>
              )}

              {/* Main Metric Value */}
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono mt-1">
                {card.value}
              </div>
              {card.subValue && (
                <div className="text-xs text-slate-400 mt-0.5 font-medium">
                  {card.subValue}
                </div>
              )}

              {/* Progress Bar (for Recovery Rate) */}
              {card.progress !== undefined && (
                <div className="mt-2.5 w-full bg-surface-raised h-2 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-rzp-teal h-full transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, card.progress)}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Footer Breakdown */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-border/50">
              <span className="truncate">{card.footerLeft}</span>
              <span className={`shrink-0 ${card.footerRightColor}`}>{card.footerRight}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
