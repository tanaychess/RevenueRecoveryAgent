import React, { useState } from "react";
import { AuditEntry, formatInr, resolvePayment } from "@/lib/api";

interface Props {
  entry: AuditEntry | null;
  onClose: () => void;
  onOpenInChat: (entry: AuditEntry) => void;
  onPaymentResolved?: () => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  recovered: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40" },
  in_progress: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/40" },
  scheduled: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/40" },
  escalated: { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/40" },
  stopped: { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-500/40" },
  exhausted: { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/40" },
  customer_promised: { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/40" },
};

export default function AuditInspectorDrawer({
  entry,
  onClose,
  onOpenInChat,
  onPaymentResolved,
}: Props) {
  const [resolving, setResolving] = useState(false);
  const [localEntry, setLocalEntry] = useState<AuditEntry | null>(entry);

  // Sync state if entry changes
  React.useEffect(() => {
    setLocalEntry(entry);
  }, [entry]);

  if (!localEntry) return null;

  const currentStatus = localEntry.status;
  const statusBadge = STATUS_BADGES[currentStatus] || STATUS_BADGES.in_progress;
  const attemptCount = localEntry.attempt_count || 0;
  const maxAttempts = localEntry.max_attempts || 4;

  async function handleSimulatePayment() {
    if (!localEntry) return;
    setResolving(true);
    try {
      await resolvePayment(localEntry.payment_id);
      const updatedTimeline = localEntry.timeline ? [...localEntry.timeline] : [];
      updatedTimeline.push({
        timestamp_iso: new Date().toISOString(),
        event_type: "payment_settled",
        title: "Customer Paid via Dynamic Link",
        description: `Captured ${formatInr(localEntry.amount_paise)}. Webhook confirmed instant settlement.`,
        actor: "customer",
        badge_variant: "emerald",
      });

      setLocalEntry({
        ...localEntry,
        status: "recovered",
        success: true,
        amount_recovered_paise: localEntry.amount_paise,
        timeline: updatedTimeline,
      });
      if (onPaymentResolved) onPaymentResolved();
    } catch (e: any) {
      alert("Error resolving payment: " + e.message);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#090F1C] h-full border-l border-border flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border/80 bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rzp-blue/15 border border-rzp-blue/30 flex items-center justify-center text-sm font-bold text-rzp-blue">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white font-mono">{localEntry.payment_id}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                  {currentStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Transaction Forensics &amp; Regulatory Compliance Trace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Amount At Risk
              </span>
              <div className="text-xl font-extrabold text-white font-mono mt-0.5">
                {formatInr(localEntry.amount_paise)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Retry Ceiling Usage
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-sm font-bold text-white font-mono">
                  {attemptCount} / {maxAttempts}
                </div>
                <div className="flex-1 bg-surface-raised h-2 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="bg-gradient-to-r from-rzp-blue to-rzp-teal h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (attemptCount / maxAttempts) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer DPDP Safe Profile */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customer Profile</h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono">
                DPDP Act 2023 Masked
              </span>
            </div>
            <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 font-mono bg-[#060A12] p-3 rounded-lg border border-border/60">
              <div>
                Name: <span className="text-white font-semibold">{localEntry.customer_name_masked}</span>
              </div>
              <div>
                Phone: <span className="text-white font-semibold">{localEntry.customer_phone_masked}</span>
              </div>
              <div>
                Bank: <span className="text-rzp-blue font-semibold">{localEntry.bank_name || "HDFC Bank"}</span>
              </div>
              <div>
                Method: <span className="text-slate-100 capitalize">{localEntry.payment_method.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          {/* Gemini AI Chain-of-Thought & Evidence */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <span>✦ Gemini 2.5 Flash Diagnostic Trace</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-500/40">
                {(localEntry.confidence * 100).toFixed(0)}% Confidence
              </span>
            </div>
            <div className="text-xs text-white font-bold capitalize flex items-center gap-2">
              <span>Root Cause:</span>
              <span className="text-purple-300">{localEntry.root_cause.replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed bg-[#070B13]/90 p-3 rounded-lg border border-purple-500/20 italic">
              &ldquo;{localEntry.reasoning}&rdquo;
            </p>

            {/* Evidence signals */}
            {localEntry.evidence && localEntry.evidence.length > 0 && (
              <div className="pt-2 border-t border-purple-500/20 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                  Extracted Evidence Signals:
                </span>
                <div className="space-y-1">
                  {localEntry.evidence.map((sig, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                      <span className="text-purple-400 font-bold">▪</span>
                      <span>{sig}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action & Regulatory Guardrails */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Autonomous Execution Trail</h4>
            <div className="text-xs text-slate-300 bg-[#070B13] p-3 rounded-lg border border-border/80 font-mono space-y-1">
              <div>
                Action: <strong className="text-rzp-teal">{localEntry.action}</strong>
              </div>
              <div className="text-[11px] text-slate-400">{localEntry.action_detail}</div>
              {localEntry.stop_condition_triggered && (
                <div className="text-amber-400 text-[11px] mt-1 font-semibold">
                  Stop Condition Triggered: {localEntry.stop_condition_triggered}
                </div>
              )}
            </div>

            {/* Compliance Badges */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                Active Regulatory Guardrails:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {localEntry.compliance_tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-raised border border-rzp-teal/40 text-rzp-teal font-mono"
                  >
                    ✓ {tag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Chronological Timeline */}
          {localEntry.timeline && localEntry.timeline.length > 0 && (
            <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Forensic Event Timeline ({localEntry.timeline.length})
              </h4>
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/70">
                {localEntry.timeline.map((ev: any, idx: number) => (
                  <div key={idx} className="relative pl-8 text-xs">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-rzp-blue ring-4 ring-[#090F1C]"></div>
                    <div className="font-semibold text-white">{ev.title}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{ev.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic 1-Click Link */}
          {localEntry.payment_link && (
            <div className="p-3.5 rounded-xl bg-surface border border-border text-xs space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Dynamic 1-Click Recovery URL:
              </span>
              <a
                href={localEntry.payment_link}
                target="_blank"
                rel="noreferrer"
                className="text-rzp-blue font-mono hover:underline block truncate text-xs font-semibold"
              >
                {localEntry.payment_link}
              </a>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border/80 bg-surface-raised flex flex-col gap-2.5">
          {currentStatus !== "recovered" && (
            <button
              onClick={handleSimulatePayment}
              disabled={resolving}
              className="w-full rzp-glow-emerald-btn py-2.5 rounded-xl font-bold text-xs text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {resolving ? "Simulating Webhook Capture…" : "⚡ Simulate Customer Paid Link (Instant Settlement)"}
            </button>
          )}
          <button
            onClick={() => onOpenInChat(localEntry)}
            className="w-full rzp-glow-btn py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2"
          >
            <span>💬</span> Test in WhatsApp AI Sandbox
          </button>
        </div>
      </div>
    </div>
  );
}
