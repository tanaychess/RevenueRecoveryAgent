# AI Revenue Recovery Agent

An autonomous, compliant AI agent that closes the loop on failed and degraded payments across Indian financial rails: **detect → diagnose root cause → decide the right intervention → smart schedule → act on Razorpay APIs → log an auditable trail.**

---

## 🚀 Key Highlights

1. **Google Gemini Reasoning Core**:
   - Classifies free-text ambiguous gateway failure messages and multi-rail degradation codes into 15 root causes with chain-of-thought evidence extraction.
   - Powers dynamic, empathetic 2-way WhatsApp recovery conversations in 8 Indian languages (Hinglish, Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, English) with customer frustration/sentiment awareness.
   - Handles real-time Promise-to-Pay snoozes, churn-prevention discount negotiations, and payment method updates.
   - Built-in boot-time provider self-check surfaced on `/health`.

2. **Deterministic Indian Regulatory Guardrails (Non-Negotiable Compliance)**:
   - **RBI Recurring E-Mandate Circulars**: Absolute hard stop on revoked mandates (0 automated debit retries) & mandatory 24h pre-debit notification requirement on payments ≥ ₹5,000.
   - **NPCI UPI AutoPay 24-Hour Spacing**: Guaranteed minimum 24h spacing on mandate presentations.
   - **TRAI DND Quiet Hours (9:00 PM – 8:00 AM IST)**: Automatic queueing and rescheduling of customer communications to 8:15 AM IST next morning.
   - **DPDP Act 2023 Compliance**: Real-time customer PII masking on names and phone numbers, plus instant honor of customer opt-out requests.

3. **Closed-Loop Razorpay Webhooks & Modern Payment Rails**:
   - HMAC-SHA256 verified real-time webhook endpoint (`/api/webhooks/razorpay`) with automated status transition to `RECOVERED` on `payment_link.paid` / `payment.captured`.
   - Subscriptions API automated debit retry with issuer recovery curve modeling.
   - Dynamic 1-Click Razorpay Payment Links + UPI Intent (`upi://pay?...`) Deep-links.
   - RBI Card-on-File Tokenization (COFT) seamless 1-click re-consent workflows.
   - Smart Routing Optimizer with real-time bank switch telemetry.
   - Process-independent deterministic simulation curves using SHA-256 seeding.

4. **World-Class FinTech Command Center Dashboard**:
   - Executive KPI cards with Net Revenue Lift vs 15% Naive Retry Baseline (+4.2x ROI).
   - Interactive 5-Stage Pipeline Funnel (Detection ➔ Diagnosis ➔ Scheduling ➔ Multi-Rail Action ➔ Settlement).
   - Interactive WhatsApp Mobile Simulator with live Gemini 2.5 multi-lingual chat & decision inspector.
   - Audit Inspector Drawer with full chain-of-thought evidence traces, customer DPDP profiles, and guardrail attempt usage trackers.
   - Buildathon Live Stress Test Arena with 1-click Mass Bank Outages, Salary Day Surges, and Custom Failure Injector.
   - Real-time 1-click "Simulate Customer Paid" link resolution with instantaneous database status updates.
   - Validated Decision Engine Policy Editor with Pydantic schema validation and 1-click restore to defaults.

---

## 🏛️ System Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │               RecoveryOrchestrator 2.0                  │
                    │                                                         │
  data/             │   1. DETECT          2. DIAGNOSE        3. DECIDE       │
  synthetic_batch   ──▶  load batch  ──▶  classify_root_   ──▶  decide_action │
  .json (60 recs)   │                     cause()               (YAML rules)  │
  or Live Webhooks  │                     │                      │            │
  (HMAC SHA-256)    │                     ▼                      ▼            │
                    │            rule_based_classifier     deterministic      │
                    │            (always runs)             lookup table:      │
                    │                     │                 max_attempts,     │
                    │                     ▼                 cooldowns,        │
                    │            [Google Gemini Flash]      stop_conditions   │
                    │            gemini_classification()   (RBI, NPCI, TRAI)  │
                    │                                                         │
                    │   4. SMART SCHEDULE  5. ACT             6. AUDIT        │
                    │   TRAI Quiet Hours  ──▶ execute_     ──▶ AuditLogEntry  │
                    │   & Bank Telemetry      action()         (SQLite/SQLA)  │
                    │                         ├─▶ Subscriptions Re-Debit      │
                    │                         ├─▶ Dynamic UPI Payment Link    │
                    │                         ├─▶ WhatsApp Interactive Nudge  │
                    │                         └─▶ Escalate Human (Quarantine) │
                    └─────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                               FastAPI (server/) REST endpoints
                                              │
                                              ▼
                     Next.js FinTech Command Center (React, Tailwind, Recharts)
```

---

## ⚡ Quickstart

### Option A — Run locally (Fastest)

**1. Backend (Terminal 1)**
```bash
# Using Python virtual environment
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # App runs 100% with zero keys (deterministic fallback) or add GEMINI_API_KEY
uvicorn server:app --reload --port 8000
```

**2. Dashboard (Terminal 2)**
```bash
cd dashboard
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

Open **http://localhost:3000** in your browser and click **"Run Batch"**!

### Option B — Docker Compose

```bash
docker compose up --build
```

---

## 🧪 Testing

Run the full automated test suite (35+ unit & integration tests):
```bash
pytest tests/ -v
```
