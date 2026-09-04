import React, { useEffect, useState } from "react";
import { getRulesConfig, resetRulesConfig, updateRulesConfig } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: Props) {
  const [editorTab, setEditorTab] = useState<"visual" | "yaml">("visual");
  const [configObj, setConfigObj] = useState<any | null>(null);
  const [configJson, setConfigJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  async function loadConfig() {
    setLoading(true);
    setErrorStatus(null);
    try {
      const cfg = await getRulesConfig();
      setConfigObj(cfg);
      setConfigJson(JSON.stringify(cfg, null, 2));
    } catch (e: any) {
      setErrorStatus("Error loading configuration: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setSavedStatus(null);
    setErrorStatus(null);
    try {
      let dataToSave = configObj;
      if (editorTab === "yaml") {
        dataToSave = JSON.parse(configJson);
      }
      await updateRulesConfig(dataToSave);
      setConfigObj(dataToSave);
      setConfigJson(JSON.stringify(dataToSave, null, 2));
      setSavedStatus("Policy rules validated and updated successfully in engine runtime!");
      setTimeout(() => setSavedStatus(null), 3500);
    } catch (e: any) {
      setErrorStatus("Validation Error: " + (e.message || "Invalid configuration structure"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetToDefaults() {
    if (!confirm("Are you sure you want to reset all playbooks and rules to factory default values?")) return;
    setLoading(true);
    setSavedStatus(null);
    setErrorStatus(null);
    try {
      const res = await resetRulesConfig();
      setConfigObj(res.config);
      setConfigJson(JSON.stringify(res.config, null, 2));
      setSavedStatus("Policy configuration restored to default factory baseline.");
      setTimeout(() => setSavedStatus(null), 3500);
    } catch (e: any) {
      setErrorStatus("Failed to restore defaults: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#090F1C] border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rzp-blue/15 border border-rzp-blue/30 flex items-center justify-center text-sm font-bold text-rzp-blue">
              ⚙️
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Decision Engine Policy &amp; Guardrails Studio</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic policy rules controlling retry ceilings, cooldown spacing, and TRAI quiet hours.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface p-1 rounded-xl border border-border">
              <button
                onClick={() => setEditorTab("visual")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  editorTab === "visual" ? "bg-rzp-blue text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Visual Form
              </button>
              <button
                onClick={() => {
                  setConfigJson(JSON.stringify(configObj, null, 2));
                  setEditorTab("yaml");
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  editorTab === "yaml" ? "bg-rzp-blue text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Raw JSON / YAML
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {savedStatus && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow">
              <span>✓</span>
              <span>{savedStatus}</span>
            </div>
          )}
          {errorStatus && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 shadow">
              <span>✕</span>
              <span>{errorStatus}</span>
            </div>
          )}

          {editorTab === "visual" && configObj ? (
            <div className="space-y-5 text-xs">
              {/* Card 1: Retry Policy */}
              <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="text-rzp-blue">↻</span> Retry &amp; Cooldown Ceilings
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Max Retry Attempts</label>
                    <input
                      type="number"
                      value={configObj?.playbooks?.retry_policy?.max_attempts || 4}
                      onChange={(e) =>
                        setConfigObj({
                          ...configObj,
                          playbooks: {
                            ...configObj.playbooks,
                            retry_policy: {
                              ...configObj.playbooks?.retry_policy,
                              max_attempts: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-white font-mono outline-none focus:border-rzp-blue"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Initial Backoff (Hours)</label>
                    <input
                      type="number"
                      value={configObj?.playbooks?.retry_policy?.initial_backoff_hours || 4}
                      onChange={(e) =>
                        setConfigObj({
                          ...configObj,
                          playbooks: {
                            ...configObj.playbooks,
                            retry_policy: {
                              ...configObj.playbooks?.retry_policy,
                              initial_backoff_hours: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-white font-mono outline-none focus:border-rzp-blue"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Max Backoff (Hours)</label>
                    <input
                      type="number"
                      value={configObj?.playbooks?.retry_policy?.max_backoff_hours || 72}
                      onChange={(e) =>
                        setConfigObj({
                          ...configObj,
                          playbooks: {
                            ...configObj.playbooks,
                            retry_policy: {
                              ...configObj.playbooks?.retry_policy,
                              max_backoff_hours: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-white font-mono outline-none focus:border-rzp-blue"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: TRAI Quiet Hours */}
              <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="text-amber-400">🌙</span> TRAI DND Quiet Hours Window (IST)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Quiet Hours Start (Hour 0-23)</label>
                    <input
                      type="number"
                      value={configObj?.playbooks?.quiet_hours?.start_hour || 21}
                      onChange={(e) =>
                        setConfigObj({
                          ...configObj,
                          playbooks: {
                            ...configObj.playbooks,
                            quiet_hours: {
                              ...configObj.playbooks?.quiet_hours,
                              start_hour: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-white font-mono outline-none focus:border-rzp-blue"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Default: 21 (9:00 PM IST)</span>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Quiet Hours End (Hour 0-23)</label>
                    <input
                      type="number"
                      value={configObj?.playbooks?.quiet_hours?.end_hour || 8}
                      onChange={(e) =>
                        setConfigObj({
                          ...configObj,
                          playbooks: {
                            ...configObj.playbooks,
                            quiet_hours: {
                              ...configObj.playbooks?.quiet_hours,
                              end_hour: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-white font-mono outline-none focus:border-rzp-blue"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Default: 8 (8:00 AM IST)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: VIP Retention Offers */}
              <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="text-emerald-400">🏷️</span> VIP Churn Prevention Discount Cap
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Max VIP Discount (%)</label>
                    <input
                      type="number"
                      value={configObj?.playbooks?.discounts?.max_discount_pct || 10}
                      onChange={(e) =>
                        setConfigObj({
                          ...configObj,
                          playbooks: {
                            ...configObj.playbooks,
                            discounts: {
                              ...configObj.playbooks?.discounts,
                              max_discount_pct: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-white font-mono outline-none focus:border-rzp-blue"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Applies To Customer Tiers</label>
                    <input
                      type="text"
                      disabled
                      value="VIP, High-LTV Subscribers"
                      className="w-full bg-[#060A12] border border-border rounded-xl p-2.5 text-slate-400 font-mono outline-none opacity-80"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              disabled={loading}
              rows={18}
              className="w-full bg-[#060A12] border border-border rounded-2xl p-4 font-mono text-xs text-slate-200 outline-none focus:border-rzp-blue leading-relaxed shadow-inner"
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-raised flex items-center justify-between">
          <button
            onClick={handleResetToDefaults}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
          >
            ↺ Reset to Factory Baseline
          </button>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface border border-border text-slate-300 text-xs font-semibold hover:bg-surface-raised"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 rounded-xl rzp-glow-btn text-white text-xs font-bold transition disabled:opacity-50 shadow-lg"
            >
              {loading ? "Validating & Saving…" : "Save Policy Config"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
