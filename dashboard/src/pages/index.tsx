import React, { useEffect, useState } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import MetricCards from "@/components/MetricCards";
import PipelineFunnel from "@/components/PipelineFunnel";
import RootCauseChart from "@/components/RootCauseChart";
import PaymentMethodChart from "@/components/PaymentMethodChart";
import AuditTable from "@/components/AuditTable";
import WhatsAppSimulator from "@/components/WhatsAppSimulator";
import ScenarioArena from "@/components/ScenarioArena";
import RoiCalculator from "@/components/RoiCalculator";
import ComplianceMatrix from "@/components/ComplianceMatrix";
import RulesModal from "@/components/RulesModal";
import SystemTourModal from "@/components/SystemTourModal";
import {
  AuditEntry,
  BatchMetrics,
  getAudit,
  getHealth,
  getMetrics,
  HealthInfo,
  processBatch,
  resetBatch,
} from "@/lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<BatchMetrics | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedChatEntry, setSelectedChatEntry] = useState<AuditEntry | null>(null);

  async function loadInitialData() {
    setInitialLoading(true);
    try {
      const h = await getHealth();
      setHealth(h);
    } catch (e) {
      // Backend initializing
    }

    try {
      const m = await getMetrics();
      if (m.batch_processed) {
        setMetrics(m.metrics);
        const a = await getAudit(200);
        setEntries(a.entries);
      }
    } catch (e) {
      // No batch processed yet
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function handleRunBatch() {
    setLoading(true);
    setNotification(null);
    try {
      const result = await processBatch();
      setMetrics(result.metrics);
      const a = await getAudit(200);
      setEntries(a.entries);
      setNotification(
        `Successfully processed ${result.processed} synthetic payments with ${(result.metrics.recovery_rate * 100).toFixed(1)}% recovery yield.`
      );
      setTimeout(() => setNotification(null), 5000);
    } catch (e: any) {
      alert("Error processing batch: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setLoading(true);
    try {
      await resetBatch();
      setMetrics(null);
      setEntries([]);
      setNotification("Audit trail and memory ledger reset cleanly.");
      setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
      alert("Error resetting batch: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    try {
      const m = await getMetrics();
      if (m.batch_processed) {
        setMetrics(m.metrics);
      }
      const a = await getAudit(200);
      setEntries(a.entries);
    } catch (e) {}
  }

  function handleSelectForChat(entry: AuditEntry) {
    setSelectedChatEntry(entry);
    setActiveTab("whatsapp");
  }

  return (
    <>
      <Head>
        <title>AI Revenue Recovery Agent 2.0 | Next-Gen Financial AI</title>
        <meta
          name="description"
          content="Autonomous AI Revenue Recovery Engine for failed payments across UPI AutoPay, Cards, and NetBanking with Artificial Intelligence and RBI/NPCI compliance guardrails."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-obsidian text-slate-100 flex flex-col selection:bg-rzp-blue selection:text-white">
        {/* Navigation & Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          health={health}
          loading={loading}
          onRunBatch={handleRunBatch}
          onReset={handleReset}
          onOpenRules={() => setRulesOpen(true)}
          onOpenTour={() => setTourOpen(true)}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xl backdrop-blur-md">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  ✓
                </span>
                <span>{notification}</span>
              </span>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white transition px-2">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col gap-6">
          {/* Initial Loading Skeleton */}
          {initialLoading && !metrics ? (
            <div className="glass-card rounded-2xl p-16 text-center border border-border/80 my-8 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rzp-blue to-rzp-teal p-0.5 mx-auto mb-4 animate-pulse">
                <div className="w-full h-full bg-[#080E1A] rounded-[14px] flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-rzp-blue/30 border-t-rzp-blue rounded-full animate-spin"></div>
                </div>
              </div>
              <h3 className="text-base font-bold text-white mb-1">Connecting to Recovery Agent Core</h3>
              <p className="text-xs text-slate-400 font-mono">Initializing Artificial Intelligence &amp; Regulatory Policies…</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Operations & Funnel */}
              {activeTab === "overview" && (
                <>
                  {metrics ? (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* 1. Primary KPI Metric Cards */}
                      <MetricCards metrics={metrics} />

                      {/* 2. Interactive 5-Stage Funnel */}
                      <PipelineFunnel metrics={metrics} />

                      {/* 3. Deep Diagnostics & Rail Analytics Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7">
                          <RootCauseChart metrics={metrics} />
                        </div>
                        <div className="lg:col-span-5">
                          <PaymentMethodChart metrics={metrics} />
                        </div>
                      </div>

                      {/* 4. Live Audit Ledger (First 10 records with full drill-down) */}
                      <AuditTable
                        entries={entries.slice(0, 10)}
                        onPaymentResolved={refreshData}
                        onSelectForChat={handleSelectForChat}
                      />
                    </div>
                  ) : (
                    /* High-Impact Empty State / First-Time Hero */
                    <div className="glass-card rounded-3xl p-10 sm:p-14 text-center border border-rzp-blue/30 bg-gradient-to-b from-[#0B1528] to-[#070C18] my-4 shadow-2xl relative overflow-hidden">
                      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-rzp-blue/10 rounded-full blur-3xl pointer-events-none"></div>

                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rzp-blue via-rzp-indigo to-rzp-teal p-0.5 mx-auto flex items-center justify-center mb-5 shadow-xl shadow-rzp-blue/20">
                        <div className="w-full h-full bg-[#080E1B] rounded-[14px] flex items-center justify-center text-2xl">
                          ⚡
                        </div>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
                        Autonomous AI Revenue Recovery Engine
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
                        Eliminate lost revenue across UPI AutoPay, COFT Cards, and NetBanking. AI diagnoses failures in &lt;140ms while deterministic RBI &amp; NPCI guardrails enforce strict regulatory compliance.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => setTourOpen(true)}
                          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-rzp-blue/40 bg-surface hover:bg-surface-raised text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                          <span>💡</span>
                          <span>Explore Architecture Tour</span>
                        </button>
                        <button
                          onClick={handleRunBatch}
                          disabled={loading}
                          className="w-full sm:w-auto rzp-glow-btn text-white text-xs font-extrabold px-7 py-3 rounded-xl transition shadow-xl shadow-rzp-blue/25 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              <span>Processing 60 Payments…</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>Run Batch of 60 Synthetic Records</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 pt-8 border-t border-border/50 max-w-3xl mx-auto text-left">
                        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Latency</div>
                          <div className="text-xs font-bold text-white mt-0.5">&lt;140ms AI Inference</div>
                        </div>
                        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Recovery Yield</div>
                          <div className="text-xs font-bold text-emerald-400 mt-0.5">44%+ vs 15% Baseline</div>
                        </div>
                        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Guardrails</div>
                          <div className="text-xs font-bold text-rzp-blue mt-0.5">RBI · NPCI · TRAI · DPDP</div>
                        </div>
                        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Channels</div>
                          <div className="text-xs font-bold text-purple-300 mt-0.5">WhatsApp · Links · Retries</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tab 2: WhatsApp AI Sandbox */}
              {activeTab === "whatsapp" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="glass-card rounded-2xl p-5 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>💬 Omnichannel 2-Way Conversational Recovery Engine</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Powered by Artificial Intelligence: Multi-turn negotiation, VIP churn discounts, Promise-to-Pay snoozing, and 8-language fluency.
                      </p>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold shrink-0">
                      DPDP PII Encrypted
                    </span>
                  </div>
                  <WhatsAppSimulator initialEntry={selectedChatEntry} />
                </div>
              )}

              {/* Tab 3: Stress Test Arena */}
              {activeTab === "scenarios" && (
                <div className="animate-in fade-in duration-200">
                  <ScenarioArena onBatchUpdated={refreshData} />
                </div>
              )}

              {/* Tab 4: Audit Trail & Forensics */}
              {activeTab === "audit" && (
                <div className="animate-in fade-in duration-200">
                  <AuditTable
                    entries={entries}
                    onPaymentResolved={refreshData}
                    onSelectForChat={handleSelectForChat}
                  />
                </div>
              )}

              {/* Tab 5: Merchant ROI Calculator */}
              {activeTab === "roi" && (
                <div className="animate-in fade-in duration-200">
                  <RoiCalculator />
                </div>
              )}

              {/* Tab 6: Regulatory Compliance Matrix */}
              {activeTab === "compliance" && (
                <div className="animate-in fade-in duration-200">
                  <ComplianceMatrix />
                </div>
              )}
            </>
          )}
        </main>

        {/* Playbook Rules YAML & Visual Editor Modal */}
        <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

        {/* Interactive Architecture Tour & Concepts Modal */}
        <SystemTourModal
          isOpen={tourOpen}
          onClose={() => setTourOpen(false)}
          onRunBatch={handleRunBatch}
        />

        {/* Sleek Modern Footer */}
        <footer className="border-t border-border/60 py-6 mt-12 bg-[#060A12]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>
                Built for <strong className="text-slate-300">a stronger payments environment</strong> · AI Revenue Recovery Track
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="hover:text-rzp-blue transition cursor-pointer" onClick={() => setTourOpen(true)}>
                Architecture Guide
              </span>
              <span>•</span>
              <span className="hover:text-rzp-blue transition cursor-pointer" onClick={() => setRulesOpen(true)}>
                Playbook Rules
              </span>
              <span>•</span>
              <span>Artificial Intelligence</span>
              <span>•</span>
              <span>RBI / NPCI Guardrails</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
