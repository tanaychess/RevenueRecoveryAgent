import React from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { BatchMetrics } from "@/lib/api";

interface Props {
  metrics: BatchMetrics;
}

interface MethodMeta {
  label: string;
  badge: string;
  color: string;
  benchmarkRate: string;
}

const METHOD_META: Record<string, MethodMeta> = {
  upi_autopay: {
    label: "UPI AutoPay (e-Mandate)",
    badge: "NPCI 24h Spacing",
    color: "#00D2C4",
    benchmarkRate: "68% Success",
  },
  credit_card: {
    label: "Credit Cards (COFT)",
    badge: "RBI Tokenization",
    color: "#3395FF",
    benchmarkRate: "52% Success",
  },
  debit_card: {
    label: "Debit Cards (Pin/OTP)",
    badge: "3DS Auth",
    color: "#8B5CF6",
    benchmarkRate: "44% Success",
  },
  netbanking: {
    label: "NetBanking Gateways",
    badge: "Switch Routing",
    color: "#F59E0B",
    benchmarkRate: "40% Success",
  },
  upi: {
    label: "UPI Single / Intent",
    badge: "1-Click Dynamic",
    color: "#10B981",
    benchmarkRate: "74% Success",
  },
  wallet: {
    label: "Wallets & PPIs",
    badge: "Instant Debit",
    color: "#EC4899",
    benchmarkRate: "60% Success",
  },
  bnpl: {
    label: "BNPL / Pay Later",
    badge: "Credit Line",
    color: "#06B6D4",
    benchmarkRate: "48% Success",
  },
};

export default function PaymentMethodChart({ metrics }: Props) {
  const data = Object.entries(metrics.channel_breakdown || {}).map(([method, count]) => {
    const meta = METHOD_META[method] || {
      label: method.replace(/_/g, " ").toUpperCase(),
      badge: "India Rail",
      color: "#3395FF",
      benchmarkRate: "50% Success",
    };
    return {
      rawMethod: method,
      name: meta.label,
      badge: meta.badge,
      color: meta.color,
      benchmarkRate: meta.benchmarkRate,
      value: count,
      pct: ((count / (metrics.batch_size || 1)) * 100).toFixed(1),
    };
  });

  return (
    <div className="glass-card rounded-2xl p-6 border border-border/80 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Payment Rails &amp; Gateway Mix</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-slate-300 font-mono">
              India Rails
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">
          Breakdown across UPI AutoPay e-mandates, RBI tokenized cards, and NetBanking gateways.
        </p>
      </div>

      {/* Donut Chart with Center Stats */}
      <div className="h-[220px] w-full relative flex items-center justify-center">
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#090F1C] border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1 z-30">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: d.color }}
                            ></span>
                            <span>{d.name}</span>
                          </div>
                          <div className="text-slate-300 font-mono">
                            Volume: <span className="font-bold text-white">{d.value}</span> ({d.pct}%)
                          </div>
                          <div className="text-[10px] text-rzp-teal font-mono">
                            Regulatory Spec: {d.badge}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={`cell-${entry.rawMethod}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-white font-mono">{metrics.batch_size}</span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Payments</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500">Run batch to populate rail breakdown</div>
        )}
      </div>

      {/* Rail Breakdown Legend Grid */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/50">
        {data.map((d) => (
          <div key={d.name} className="p-2 rounded-lg bg-surface/60 border border-border/60 flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              ></span>
              <span className="text-slate-200 truncate text-[11px]">{d.name.split("(")[0].trim()}</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px] shrink-0 font-bold">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
