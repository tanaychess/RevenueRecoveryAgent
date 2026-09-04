import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BatchMetrics, formatInr } from "@/lib/api";

interface Props {
  metrics: BatchMetrics;
}

interface RootCauseMeta {
  label: string;
  category: "Technical" | "Customer Funds" | "Mandate & Token" | "Risk & Security";
  avgRecoveryPct: number;
}

const ROOT_CAUSE_META: Record<string, RootCauseMeta> = {
  insufficient_funds: { label: "Insufficient Funds", category: "Customer Funds", avgRecoveryPct: 62 },
  card_expired: { label: "Card Expired", category: "Mandate & Token", avgRecoveryPct: 54 },
  bank_decline_soft: { label: "Bank Soft Decline", category: "Technical", avgRecoveryPct: 48 },
  mandate_revoked: { label: "Mandate Revoked (RBI Stop)", category: "Mandate & Token", avgRecoveryPct: 0 },
  mandate_paused: { label: "Mandate Paused", category: "Mandate & Token", avgRecoveryPct: 35 },
  upi_pin_limit: { label: "UPI Daily PIN Limit", category: "Customer Funds", avgRecoveryPct: 70 },
  upi_app_unavailable: { label: "UPI Switch Timeout", category: "Technical", avgRecoveryPct: 58 },
  netbanking_down: { label: "NetBanking Gateway Outage", category: "Technical", avgRecoveryPct: 52 },
  coft_token_expired: { label: "COFT Cryptogram Expired", category: "Mandate & Token", avgRecoveryPct: 55 },
  authentication_failed_3ds: { label: "3DS Auth Failed", category: "Technical", avgRecoveryPct: 42 },
  bnpl_limit_exceeded: { label: "BNPL Credit Limit", category: "Customer Funds", avgRecoveryPct: 38 },
  wallet_kyc_pending: { label: "Wallet KYC Pending", category: "Mandate & Token", avgRecoveryPct: 45 },
  fraud_hold: { label: "Suspected Fraud / AML Hold", category: "Risk & Security", avgRecoveryPct: 0 },
  technical_timeout: { label: "Technical Gateway Timeout", category: "Technical", avgRecoveryPct: 56 },
  unknown: { label: "Unknown Code", category: "Technical", avgRecoveryPct: 20 },
};

const CATEGORY_COLORS: Record<string, string> = {
  Technical: "#3395FF",
  "Customer Funds": "#00D2C4",
  "Mandate & Token": "#8B5CF6",
  "Risk & Security": "#F43F5E",
};

export default function RootCauseChart({ metrics }: Props) {
  const [viewMode, setViewMode] = useState<"count" | "amount" | "recovery_pct">("count");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const totalAtRiskPaise = metrics.total_amount_at_risk_paise || 1;
  const avgAmountPerRecord = totalAtRiskPaise / (metrics.batch_size || 1);

  const rawData = Object.entries(metrics.root_cause_breakdown || {}).map(([key, count]) => {
    const meta = ROOT_CAUSE_META[key] || {
      label: key.replace(/_/g, " ").toUpperCase(),
      category: "Technical" as const,
      avgRecoveryPct: 30,
    };
    const estimatedPaise = count * avgAmountPerRecord;

    return {
      rawKey: key,
      name: meta.label,
      category: meta.category,
      count,
      pctOfBatch: ((count / (metrics.batch_size || 1)) * 100).toFixed(1),
      estimatedAmountPaise: estimatedPaise,
      estimatedRecoveryRate: meta.avgRecoveryPct,
      value:
        viewMode === "count"
          ? count
          : viewMode === "amount"
          ? Math.round(estimatedPaise / 100)
          : meta.avgRecoveryPct,
    };
  });

  const filteredData = rawData
    .filter((d) => selectedCategory === "all" || d.category === selectedCategory)
    .sort((a, b) => b.value - a.value);

  const topCause = rawData.slice().sort((a, b) => b.count - a.count)[0];

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/80 flex flex-col justify-between h-full">
      <div>
        {/* Header & View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Root-Cause Diagnostic Spectrum</span>
              </h3>
              <span className="text-xs text-rzp-blue font-mono font-semibold px-2 py-0.5 rounded-full bg-rzp-blue/15 border border-rzp-blue/30">
                {rawData.length} Detected Causes
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gemini 2.5 Flash classifies cryptic bank decline codes into 15 actionable recovery buckets.
            </p>
          </div>

          {/* View Mode Toggle Pill */}
          <div className="flex items-center bg-surface p-1 rounded-xl border border-border shrink-0">
            <button
              onClick={() => setViewMode("count")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                viewMode === "count"
                  ? "bg-rzp-blue text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Failure Count
            </button>
            <button
              onClick={() => setViewMode("amount")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                viewMode === "amount"
                  ? "bg-rzp-blue text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Volume (INR)
            </button>
            <button
              onClick={() => setViewMode("recovery_pct")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                viewMode === "recovery_pct"
                  ? "bg-rzp-blue text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Avg Recovery %
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 pt-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
              selectedCategory === "all"
                ? "bg-surface-raised border-white/30 text-white"
                : "border-border text-slate-400 hover:text-slate-200"
            }`}
          >
            All Categories ({rawData.length})
          </button>
          {["Customer Funds", "Mandate & Token", "Technical", "Risk & Security"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? "bg-surface-raised border-white/30 text-white"
                  : "border-border text-slate-400 hover:text-slate-200"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              ></span>
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[340px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            layout="vertical"
            margin={{ left: 15, right: 35, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#172236" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#94A3B8", fontSize: 11 }}
              tickFormatter={(v) =>
                viewMode === "amount"
                  ? `₹${(v / 1000).toFixed(0)}k`
                  : viewMode === "recovery_pct"
                  ? `${v}%`
                  : `${v}`
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fill: "#E2E8F0", fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#090F1C] border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-30">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-white">{d.name}</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[d.category]}20`,
                            color: CATEGORY_COLORS[d.category],
                          }}
                        >
                          {d.category}
                        </span>
                      </div>
                      <div className="text-slate-300 font-mono">
                        Count: <span className="font-bold text-white">{d.count}</span> failures ({d.pctOfBatch}%)
                      </div>
                      <div className="text-slate-300 font-mono">
                        Est. At-Risk: <span className="font-bold text-rose-400">{formatInr(d.estimatedAmountPaise)}</span>
                      </div>
                      <div className="text-slate-300 font-mono">
                        Avg Recovery Potential:{" "}
                        <span className="font-bold text-emerald-400">{d.estimatedRecoveryRate}%</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-border">
                        Internal ID: {d.rawKey}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {filteredData.map((entry) => (
                <Cell
                  key={`cell-${entry.rawKey}`}
                  fill={CATEGORY_COLORS[entry.category] || "#3395FF"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Takeaway Insight Footer */}
      {topCause && (
        <div className="mt-4 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">★ Key Diagnostic Insight:</span>
            <span className="text-slate-300">
              <strong className="text-white">{topCause.name}</strong> represents {topCause.pctOfBatch}% of all failures.
            </span>
          </div>
          <span className="text-rzp-teal font-mono text-[11px]">
            Prescription: Smart Schedule Retries &amp; Dynamic UPI Links
          </span>
        </div>
      )}
    </div>
  );
}
