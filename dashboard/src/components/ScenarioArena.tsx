import React, { useState } from "react";
import { simulateCustomFailure, simulateScenario } from "@/lib/api";

interface Props {
  onBatchUpdated: () => void;
}

export default function ScenarioArena({ onBatchUpdated }: Props) {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [scenarioResult, setScenarioResult] = useState<any | null>(null);

  // Custom failure injector state
  const [custName, setCustName] = useState("Vikram Patel");
  const [custPhone, setCustPhone] = useState("9812345678");
  const [amountInr, setAmountInr] = useState(2499);
  const [paymentMethod, setPaymentMethod] = useState("upi_autopay");
  const [bankName, setBankName] = useState("HDFC Bank");
  const [failureCode, setFailureCode] = useState("UPI_PIN_LIMIT");
  const [failureMessage, setFailureMessage] = useState(
    "Daily UPI bank debit transaction limit exceeded for customer account."
  );
  const [customerTier, setCustomerTier] = useState("VIP");
  const [customResult, setCustomResult] = useState<any | null>(null);

  const presets = [
    {
      label: "UPI Daily PIN Limit",
      code: "UPI_PIN_LIMIT",
      msg: "Daily UPI bank debit transaction limit exceeded for customer account.",
      method: "upi_autopay",
      bank: "State Bank of India",
      tier: "Standard",
      tag: "Snooze to 00:01 AM",
    },
    {
      label: "RBI Mandate Revoked",
      code: "MANDATE_REVOKED",
      msg: "Customer revoked recurring e-mandate on bank netbanking portal.",
      method: "upi_autopay",
      bank: "HDFC Bank",
      tier: "VIP",
      tag: "RBI Hard Stop",
    },
    {
      label: "COFT Card Token Expired",
      code: "COFT_TOKEN_EXPIRED",
      msg: "Card-on-File cryptogram expired according to RBI tokenization schedule.",
      method: "credit_card",
      bank: "ICICI Bank",
      tier: "VIP",
      tag: "1-Click Re-Consent",
    },
    {
      label: "Suspected Fraud / AML",
      code: "SUSPECTED_FRAUD",
      msg: "High-risk velocity anomaly detected by bank risk engine.",
      method: "credit_card",
      bank: "Axis Bank",
      tier: "Standard",
      tag: "Zero-Contact Quarantine",
    },
  ];

  function applyPreset(p: (typeof presets)[0]) {
    setFailureCode(p.code);
    setFailureMessage(p.msg);
    setPaymentMethod(p.method);
    setBankName(p.bank);
    setCustomerTier(p.tier);
  }

  async function handleLaunchScenario(
    scenarioType: "mass_bank_outage" | "salary_day_surge" | "card_token_expiry",
    bank: string,
    count: number
  ) {
    setLoadingScenario(scenarioType);
    setScenarioResult(null);
    try {
      const res = await simulateScenario({
        scenario_type: scenarioType,
        bank_name: bank,
        count,
      });
      setScenarioResult(res);
      onBatchUpdated();
    } catch (e: any) {
      alert("Error launching scenario: " + e.message);
    } finally {
      setLoadingScenario(null);
    }
  }

  async function handleInjectCustom() {
    setLoadingScenario("custom");
    setCustomResult(null);
    try {
      const res = await simulateCustomFailure({
        customer_name: custName,
        customer_phone: custPhone,
        amount_inr: Number(amountInr),
        payment_method: paymentMethod,
        bank_name: bankName,
        failure_code: failureCode,
        failure_message: failureMessage,
        customer_tier: customerTier,
      });
      setCustomResult(res);
      onBatchUpdated();
    } catch (e: any) {
      alert("Error injecting custom failure: " + e.message);
    } finally {
      setLoadingScenario(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1-Click Mass Stress Test Scenarios */}
      <div className="glass-card rounded-2xl p-6 border border-border/80 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg">⚡</span>
              <h3 className="text-base font-bold text-white tracking-tight">
                High-Volume Banking Rail Stress Scenarios
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                1-CLICK SIMULATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate macro-economic payment failures across Indian banking switches with instant AI recovery.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Scenario 1: Bank Outage */}
          <div className="glass-card rounded-2xl p-5 border border-rose-500/30 bg-rose-950/15 flex flex-col justify-between hover:border-rose-500/60 transition shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Switch Degradation
                </span>
                <span className="text-xs text-slate-300 font-mono font-bold">25 Txns</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">HDFC Core Switch Outage</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mass NetBanking &amp; issuer gateway dropoffs. Tests smart fallback routing to preserve subscription authorizations without bombarding the switch.
              </p>
            </div>
            <button
              onClick={() => handleLaunchScenario("mass_bank_outage", "HDFC Bank", 25)}
              disabled={loadingScenario !== null}
              className="mt-4 text-xs font-bold px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 shadow-md shadow-rose-600/30 flex items-center justify-center gap-2"
            >
              {loadingScenario === "mass_bank_outage" ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Simulating 25 Outages…</span>
                </>
              ) : (
                <span>Simulate Bank Outage ➔</span>
              )}
            </button>
          </div>

          {/* Scenario 2: Salary Day Surge */}
          <div className="glass-card rounded-2xl p-5 border border-blue-500/30 bg-blue-950/15 flex flex-col justify-between hover:border-blue-500/60 transition shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  1st of Month Surge
                </span>
                <span className="text-xs text-slate-300 font-mono font-bold">30 Txns</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Salary Day Balance Surge</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mass insufficient funds across UPI AutoPay. Demonstrates intelligent presentation timing aligned with Indian corporate salary payroll cycles.
              </p>
            </div>
            <button
              onClick={() => handleLaunchScenario("salary_day_surge", "State Bank of India", 30)}
              disabled={loadingScenario !== null}
              className="mt-4 text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loadingScenario === "salary_day_surge" ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Simulating 30 Retries…</span>
                </>
              ) : (
                <span>Simulate Salary Day Surge ➔</span>
              )}
            </button>
          </div>

          {/* Scenario 3: COFT Expiry Wave */}
          <div className="glass-card rounded-2xl p-5 border border-purple-500/30 bg-purple-950/15 flex flex-col justify-between hover:border-purple-500/60 transition shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  RBI Mandate
                </span>
                <span className="text-xs text-slate-300 font-mono font-bold">20 Txns</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">COFT Cryptogram Expiry</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                RBI Card-on-File Token expired. Verifies automated generation of 1-click token re-consent links without interrupting customer subscriptions.
              </p>
            </div>
            <button
              onClick={() => handleLaunchScenario("card_token_expiry", "ICICI Bank", 20)}
              disabled={loadingScenario !== null}
              className="mt-4 text-xs font-bold px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-50 shadow-md shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              {loadingScenario === "card_token_expiry" ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  <span>Simulating 20 Expiries…</span>
                </>
              ) : (
                <span>Simulate COFT Expiry Wave ➔</span>
              )}
            </button>
          </div>
        </div>

        {scenarioResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">✓</span>
              <div>
                <span className="font-bold">Scenario Completed Successfully:</span> Processed{" "}
                <span className="font-mono font-bold text-white">{scenarioResult.processed_count}</span> records.
                Recovery Rate:{" "}
                <span className="font-mono font-bold text-emerald-400">
                  {(scenarioResult.metrics.recovery_rate * 100).toFixed(1)}%
                </span>.
              </div>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-700">
              Audit Log Updated
            </span>
          </div>
        )}
      </div>

      {/* Custom Transaction Injector Form */}
      <div className="glass-card rounded-2xl p-6 border border-border/80 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧪 Single Transaction Failure Injector</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inject custom failed payment payloads to test Gemini 2.5 Flash diagnosis and regulatory policy enforcement.
            </p>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mb-4 p-3 rounded-xl bg-surface/70 border border-border/70 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-highlight border border-border hover:border-rzp-blue text-slate-200 transition font-medium flex items-center gap-1.5"
            >
              <span>{p.label}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface text-rzp-teal border border-rzp-teal/30 font-mono">
                {p.tag}
              </span>
            </button>
          ))}
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Customer Name</label>
            <input
              type="text"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Amount (INR)</label>
            <input
              type="number"
              value={amountInr}
              onChange={(e) => setAmountInr(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue cursor-pointer"
            >
              <option value="upi_autopay">UPI AutoPay (e-Mandate)</option>
              <option value="credit_card">Credit Card (COFT)</option>
              <option value="debit_card">Debit Card</option>
              <option value="netbanking">NetBanking</option>
              <option value="upi">UPI Intent</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Failure Code</label>
            <select
              value={failureCode}
              onChange={(e) => setFailureCode(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue cursor-pointer font-mono"
            >
              <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
              <option value="CARD_EXPIRED">CARD_EXPIRED</option>
              <option value="COFT_TOKEN_EXPIRED">COFT_TOKEN_EXPIRED</option>
              <option value="MANDATE_REVOKED">MANDATE_REVOKED (RBI Hard Stop)</option>
              <option value="UPI_PIN_LIMIT">UPI_PIN_LIMIT</option>
              <option value="NETBANKING_DOWN">NETBANKING_DOWN</option>
              <option value="SUSPECTED_FRAUD">SUSPECTED_FRAUD (Zero Contact)</option>
              <option value="ISSUER_DECLINED">ISSUER_DECLINED</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Customer Tier</label>
            <select
              value={customerTier}
              onChange={(e) => setCustomerTier(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue cursor-pointer"
            >
              <option value="VIP">VIP (Discount Eligible)</option>
              <option value="Premium">Premium</option>
              <option value="Standard">Standard</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-slate-400 block mb-1 font-medium">Raw Failure Message / Bank Switch Reason</label>
            <input
              type="text"
              value={failureMessage}
              onChange={(e) => setFailureMessage(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl p-2.5 text-white outline-none focus:border-rzp-blue"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleInjectCustom}
            disabled={loadingScenario !== null}
            className="rzp-glow-btn text-white font-bold text-xs px-6 py-2.5 rounded-xl transition disabled:opacity-50 shadow-lg"
          >
            {loadingScenario === "custom" ? "Diagnosing with Gemini…" : "Inject Failure & Execute AI Recovery ➔"}
          </button>
        </div>

        {/* Live Result Preview */}
        {customResult && (
          <div className="mt-5 p-4 rounded-xl bg-surface-raised border border-rzp-blue/40 text-xs animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-sm">Autonomous Recovery Decision:</span>
              <span className="text-rzp-teal font-mono font-bold px-2.5 py-0.5 rounded bg-surface border border-rzp-teal/40">
                {customResult.audit_entry.action}
              </span>
            </div>
            <div className="text-slate-300">
              <span className="text-slate-400 font-semibold">Diagnosis:</span>{" "}
              <span className="capitalize text-white font-bold">{customResult.audit_entry.root_cause.replace(/_/g, " ")}</span>{" "}
              <span className="text-purple-400 font-mono">
                (Confidence: {(customResult.audit_entry.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="text-slate-300 mt-2 italic bg-[#080E1A] p-3 rounded-lg border border-border/60">
              &ldquo;{customResult.audit_entry.reasoning}&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
