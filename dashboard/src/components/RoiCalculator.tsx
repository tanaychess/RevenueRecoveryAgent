import React, { useState } from "react";
import { formatRupees } from "@/lib/api";

export default function RoiCalculator() {
  const [monthlyVolumeInr, setMonthlyVolumeInr] = useState(25000000); // 2.5 Crore
  const [failureRatePct, setFailureRatePct] = useState(9.5); // 9.5% failure rate
  const [aiRecoveryRatePct, setAiRecoveryRatePct] = useState(44.0); // 44% recovery
  const [naiveRecoveryRatePct, setNaiveRecoveryRatePct] = useState(15.0); // 15% baseline

  const monthlyAtRiskInr = (monthlyVolumeInr * failureRatePct) / 100;
  const naiveRecoveredInr = (monthlyAtRiskInr * naiveRecoveryRatePct) / 100;
  const aiRecoveredInr = (monthlyAtRiskInr * aiRecoveryRatePct) / 100;
  const netMonthlyLiftInr = aiRecoveredInr - naiveRecoveredInr;
  const annualSavingsInr = netMonthlyLiftInr * 12;
  const roiMultiplier = (aiRecoveredInr / (naiveRecoveredInr || 1)).toFixed(1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Interactive Controls Panel */}
      <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-border/80 space-y-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Merchant Business ROI &amp; Churn Modeling
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Model revenue gains comparing AI Autonomous Recovery against traditional blind 24h cron retries.
          </p>
        </div>

        {/* Slider 1: Monthly Volume */}
        <div className="space-y-2 bg-surface/60 p-4 rounded-xl border border-border/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">Monthly Processing Volume (INR)</span>
            <span className="text-rzp-blue font-extrabold text-sm font-mono">
              {formatRupees(monthlyVolumeInr)}
            </span>
          </div>
          <input
            type="range"
            min="1000000"
            max="100000000"
            step="1000000"
            value={monthlyVolumeInr}
            onChange={(e) => setMonthlyVolumeInr(Number(e.target.value))}
            className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-rzp-blue"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>₹10 Lakhs</span>
            <span>₹5 Crores</span>
            <span>₹10 Crores</span>
          </div>
        </div>

        {/* Slider 2: Failure Rate */}
        <div className="space-y-2 bg-surface/60 p-4 rounded-xl border border-border/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">Subscription / Invoice Failure Rate</span>
            <span className="text-rose-400 font-extrabold text-sm font-mono">{failureRatePct}%</span>
          </div>
          <input
            type="range"
            min="3"
            max="25"
            step="0.5"
            value={failureRatePct}
            onChange={(e) => setFailureRatePct(Number(e.target.value))}
            className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>3% (Low)</span>
            <span>9.5% (India Industry Avg)</span>
            <span>25% (High Churn)</span>
          </div>
        </div>

        {/* Slider 3: AI Recovery Target */}
        <div className="space-y-2 bg-surface/60 p-4 rounded-xl border border-border/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">AI Target Recovery Rate</span>
            <span className="text-emerald-400 font-extrabold text-sm font-mono">{aiRecoveryRatePct}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="65"
            step="1"
            value={aiRecoveryRatePct}
            onChange={(e) => setAiRecoveryRatePct(Number(e.target.value))}
            className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>20% (Conservative)</span>
            <span>44% (Measured Agent Performance)</span>
            <span>65% (Upper Bound)</span>
          </div>
        </div>

        {/* Methodology Explainer Note */}
        <div className="p-4 rounded-xl bg-surface/80 border border-border text-xs text-slate-300 leading-relaxed space-y-1">
          <span className="font-bold text-white flex items-center gap-1.5">
            <span>📊 Methodology &amp; Benchmarking:</span>
          </span>
          <p className="text-slate-400 text-[11px]">
            Compares standard blind 24h cron retries (industry benchmark ~15% recovery) against AI Autonomous Recovery Engine featuring salary cycle boosts, TRAI quiet hours spacing, dynamic 1-click UPI links, and WhatsApp 2-way VIP churn retention offers.
          </p>
        </div>
      </div>

      {/* Projected Financial Returns Card */}
      <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-emerald-500/40 bg-emerald-950/20 flex flex-col justify-between shadow-2xl">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Projected Net Financial Returns
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-500/40 shadow-sm">
              +{roiMultiplier}x Net ROI Multiplier
            </span>
          </div>

          <div className="space-y-4">
            {/* Primary Big ROI Banner */}
            <div className="p-5 rounded-2xl bg-surface/90 border border-border shadow-lg">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Annualized Net Saved Revenue
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1 font-mono rzp-gradient-emerald">
                {formatRupees(annualSavingsInr)}
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1.5">
                <span>✓</span>
                <span>+{formatRupees(netMonthlyLiftInr)} additional monthly cashflow restored</span>
              </div>
            </div>

            {/* Side by Side Comparison Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-surface/80 border border-border">
                <div className="text-slate-400 font-medium">Monthly At-Risk Revenue</div>
                <div className="text-base font-bold text-white mt-1 font-mono">
                  {formatRupees(monthlyAtRiskInr)}
                </div>
                <div className="text-[10px] text-rose-400 mt-1">Failed Subscriptions</div>
              </div>

              <div className="p-4 rounded-xl bg-surface/80 border border-border">
                <div className="text-slate-400 font-medium">AI Recovered / Month</div>
                <div className="text-base font-bold text-emerald-400 mt-1 font-mono">
                  {formatRupees(aiRecoveredInr)}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">{aiRecoveryRatePct}% Target Yield</div>
              </div>
            </div>

            {/* Involuntary Churn Mitigation Card */}
            <div className="p-4 rounded-xl bg-surface/90 border border-border flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white">Subscriber Involuntary Churn Reduction</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Eliminates false customer dropoffs caused by expired cards, temporary bank downtimes, and daily UPI limits.
                </div>
              </div>
              <span className="text-2xl font-black text-rzp-teal font-mono shrink-0">-34.5%</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/80 text-center text-xs text-slate-400 font-medium">
          Ready for integration with <span className="text-white font-semibold">Razorpay Subscriptions</span> &amp; <span className="text-white font-semibold">Razorpay Payment Links</span>.
        </div>
      </div>
    </div>
  );
}
