import React, { useEffect, useState } from "react";
import { AuditEntry, ChatReplyResponse, sendChatReply } from "@/lib/api";

interface Props {
  initialEntry?: AuditEntry | null;
}

export default function WhatsAppSimulator({ initialEntry }: Props) {
  const [language, setLanguage] = useState("Hinglish");
  const [customerTier, setCustomerTier] = useState(initialEntry?.customer_tier || "VIP");
  const [amountInr, setAmountInr] = useState(initialEntry ? initialEntry.amount_paise / 100 : 1499);
  const [customerName, setCustomerName] = useState(
    initialEntry?.customer_name_masked?.replace(/\*/g, "") || "Rohan Mehta"
  );
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const initialPaymentId = initialEntry?.payment_id || "rec_70091";

  const [messages, setMessages] = useState<
    { sender: "customer" | "agent"; text: string; time: string; link?: string; upiUri?: string }[]
  >([
    {
      sender: "agent",
      text: `Hi ${customerName}, aapka ₹${amountInr.toLocaleString("en-IN")} ka subscription payment bank switch downtime ki wajah se complete nahi ho paya. Yahan 1-click me pay karein aur service continue rakhein: https://rzp.io/i/${initialPaymentId}`,
      time: "14:32",
      link: `https://rzp.io/i/${initialPaymentId}`,
      upiUri: `upi://pay?pa=razorpay.recovery@hdfcbank&pn=Razorpay+Recovery&tr=${initialPaymentId}&am=${amountInr}.00&cu=INR`,
    },
  ]);

  const [latestResponse, setLatestResponse] = useState<ChatReplyResponse | null>(null);

  useEffect(() => {
    if (initialEntry) {
      const amt = initialEntry.amount_paise / 100;
      setAmountInr(amt);
      const name = initialEntry.customer_name_masked.includes("Customer")
        ? "Rohan Mehta"
        : initialEntry.customer_name_masked;
      setCustomerName(name);
      setCustomerTier(initialEntry.customer_tier || "VIP");
      const pid = initialEntry.payment_id;
      setMessages([
        {
          sender: "agent",
          text: `Hi ${name}, aapka ₹${amt.toLocaleString("en-IN")} ka invoice payment pending hai. Yahan 1-click me pay karein aur service continue rakhein: https://rzp.io/i/${pid}`,
          time: "14:32",
          link: initialEntry.payment_link || `https://rzp.io/i/${pid}`,
          upiUri: initialEntry.upi_intent_uri,
        },
      ]);
    }
  }, [initialEntry]);

  const quickPills = [
    { label: "Can I get a discount?", text: "This subscription is quite expensive, any discount?", tag: "VIP Retention" },
    { label: "Kal subah pay karunga", text: "Kal subah 10 baje pay karunga pakka", tag: "Promise to Pay" },
    { label: "Send UPI Link instead", text: "Please send a GooglePay/PhonePe UPI link instead", tag: "Rail Switch" },
    { label: "Why did my card fail?", text: "Why did my transaction fail? My bank balance is fine.", tag: "AI Diagnosis" },
    { label: "Cancel plan & STOP", text: "Please cancel my plan and stop messaging me", tag: "Opt-Out Stop" },
  ];

  async function handleSend(customMsg?: string) {
    const textToSend = customMsg || inputText;
    if (!textToSend.trim() || loading) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { sender: "customer" as const, text: textToSend, time: timeNow };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setLoading(true);

    try {
      const resp = await sendChatReply(
        initialEntry?.payment_id || "pay_sim_chat_9001",
        textToSend,
        language,
        customerName,
        amountInr,
        customerTier,
        updatedMessages.map((m) => ({ sender: m.sender, message: m.text }))
      );

      setLatestResponse(resp);

      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: resp.agent_reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          link: resp.payment_link,
          upiUri: resp.upi_intent_uri,
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: `Hi ${customerName}, thanks for reaching out. You can complete your pending invoice here: https://rzp.io/i/${initialPaymentId}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          link: `https://rzp.io/i/${initialPaymentId}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Smartphone Mockup Frame */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="w-full max-w-[430px] rounded-[42px] border-[8px] border-[#1C2638] bg-[#0A131A] shadow-2xl overflow-hidden flex flex-col h-[670px] relative">
          {/* Phone Dynamic Island / Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 pointer-events-none flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mr-2"></div>
          </div>

          {/* Top WhatsApp App Bar */}
          <div className="bg-[#1F2C34] px-4 pt-7 pb-3 text-white flex items-center justify-between border-b border-slate-800 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center font-extrabold text-white shadow-md text-sm">
                R
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>Razorpay Recovery</span>
                  <svg className="w-4 h-4 text-[#00A884]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="text-[11px] text-[#00A884] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse"></span>
                  Gemini 2.5 Flash Verified Core
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#2A3942] text-[10px] text-slate-300 font-mono">
                {language}
              </span>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B141A] bg-opacity-95">
            <div className="text-center my-1">
              <span className="text-[10px] bg-[#182229] text-slate-400 px-3 py-1 rounded-full border border-slate-800/80 shadow">
                🔒 DPDP Act 2023 Encrypted · Masked PII
              </span>
            </div>

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  m.sender === "customer" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs relative shadow-md ${
                    m.sender === "customer"
                      ? "bg-[#005C4B] text-slate-100 rounded-tr-none"
                      : "bg-[#202C33] text-slate-200 rounded-tl-none border border-slate-700/40"
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                  {m.link && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-col gap-1.5">
                      <a
                        href={m.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00A884] hover:underline bg-[#182229] px-2.5 py-1.5 rounded-lg border border-[#00A884]/30"
                      >
                        <span>⚡ 1-Click Pay on Razorpay</span>
                      </a>
                      {m.upiUri && (
                        <div className="text-[9px] text-slate-400 font-mono truncate px-1">
                          UPI: {m.upiUri}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">{m.time}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="mr-auto bg-[#202C33] text-slate-300 p-3 rounded-2xl text-xs flex items-center gap-2 border border-slate-700/40">
                <span className="w-2 h-2 rounded-full bg-[#00A884] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#00A884] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#00A884] animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] text-slate-400 font-medium">Gemini evaluating context &amp; intent…</span>
              </div>
            )}
          </div>

          {/* Quick Scenario Pills */}
          <div className="px-3 py-2 bg-[#1F2C34] border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPills.map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSend(pill.text)}
                disabled={loading}
                className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-[#2A3942] hover:bg-[#324550] text-slate-200 border border-slate-700/60 transition disabled:opacity-50 flex items-center gap-1"
              >
                <span>{pill.label}</span>
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#1F2C34] flex items-center gap-2 border-t border-slate-800">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type in Hinglish / English / Hindi / Tamil…"
              className="flex-1 bg-[#2A3942] text-xs text-white px-3.5 py-2.5 rounded-full outline-none border border-slate-700 focus:border-[#00A884] placeholder-slate-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#029071] text-white flex items-center justify-center transition disabled:opacity-40 shrink-0 shadow"
            >
              <svg className="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Side Intelligence Controls & Real-Time Decisioning Inspector */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Profile & Language Configuration */}
        <div className="glass-card rounded-2xl p-5 border border-border/80 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚙️ Customer &amp; Language Parameters</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface text-slate-300 border border-border font-mono">
              Live Mock
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Conversational Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-white text-xs outline-none focus:border-rzp-blue cursor-pointer"
              >
                <option value="Hinglish">Hinglish (Hindi + English)</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Marathi">Marathi (मराठी)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Customer Tier (Discount Cap)</label>
              <select
                value={customerTier}
                onChange={(e) => setCustomerTier(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-white text-xs outline-none focus:border-rzp-blue cursor-pointer"
              >
                <option value="VIP">VIP (Up to 10% Churn Discount)</option>
                <option value="Premium">Premium (Up to 5% Discount)</option>
                <option value="Standard">Standard (No Discount)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-white text-xs outline-none focus:border-rzp-blue"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">Invoice Amount (₹)</label>
              <input
                type="number"
                value={amountInr}
                onChange={(e) => setAmountInr(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-xl p-2.5 text-white text-xs outline-none focus:border-rzp-blue font-mono"
              />
            </div>
          </div>
        </div>

        {/* Gemini Real-Time Decisioning Inspector */}
        <div className="glass-card rounded-2xl p-5 border border-rzp-blue/40 bg-blue-950/20 flex-1 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rzp-blue animate-pulse"></span>
                <span>Gemini 2.5 Decision Inspector</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rzp-blue/20 text-rzp-neon font-mono font-bold border border-rzp-blue/30">
                ACTIVE TRACE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Intent & Sentiment Box */}
              <div className="bg-surface/90 p-3.5 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Detected Customer Intent</div>
                  <div className="text-white font-bold text-sm capitalize">
                    {latestResponse?.intent_detected?.replace(/_/g, " ") || "Initial Outreach"}
                  </div>
                </div>
                {latestResponse?.frustration_level && (
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border ${
                      latestResponse.frustration_level === "high"
                        ? "bg-rose-950/80 text-rose-300 border-rose-600"
                        : latestResponse.frustration_level === "medium"
                        ? "bg-amber-950/80 text-amber-300 border-amber-600"
                        : "bg-emerald-950/80 text-emerald-300 border-emerald-600"
                    }`}
                  >
                    Sentiment: {latestResponse.frustration_level.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Action Triggered */}
              <div className="bg-surface/90 p-3.5 rounded-xl border border-border">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Autonomous Action Triggered</div>
                <div className="text-rzp-teal font-bold font-mono text-xs">
                  {latestResponse?.action_taken?.replace(/_/g, " ").toUpperCase() || "DISPATCH_RECOVERY_NUDGE"}
                </div>
              </div>

              {/* Discount Applied Alert */}
              {latestResponse?.applied_discount_pct ? (
                <div className="bg-emerald-950/50 p-3.5 rounded-xl border border-emerald-500/50 text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <span>🎉 VIP Churn Prevention Incentive:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">{latestResponse.applied_discount_pct}% OFF</span>
                  </div>
                  <div className="text-[11px] text-emerald-400/90 font-mono">
                    Adjusted invoice from ₹{amountInr.toLocaleString("en-IN")} to ₹
                    {(amountInr * (1 - latestResponse.applied_discount_pct / 100)).toFixed(0)}.
                  </div>
                </div>
              ) : null}

              {/* Chain of Thought Quote */}
              <div className="bg-surface/90 p-3.5 rounded-xl border border-border">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Reasoning Trace Summary</div>
                <div className="text-slate-300 italic text-xs leading-relaxed">
                  &ldquo;{latestResponse?.reasoning_summary || "Contextual customer assistance with 1-click Razorpay payment link."}&rdquo;
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Model: Gemini 2.5 Flash</span>
            <span className="text-emerald-400">Zero PII Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
