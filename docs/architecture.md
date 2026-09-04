# Architecture & System Design — Razorpay AI Revenue Recovery Agent 2.0 (Buildathon 2026)

## High-Level Multi-Agent Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │               RecoveryOrchestrator 2.0                  │
                    │                                                         │
  data/             │   1. DETECT          2. DIAGNOSE        3. DECIDE       │
  synthetic_batch   ──▶  load batch  ──▶  classify_root_   ──▶ decide_action │
  .json (60 recs)   │                     cause()               (YAML rules)  │
  or Live Webhooks  │                     │                      │            │
  (HMAC SHA-256)    │                     ▼                      ▼            │
                    │            rule_based_classifier     deterministic      │
                    │            (always runs)             lookup table:      │
                    │                     │                 max_attempts,     │
                    │                     ▼                 cooldowns,        │
                    │           [Google Gemini 2.5 Flash]   stop_conditions   │
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

## Component Responsibilities & Sub-Agent Division

| Component / Sub-Agent | Responsibility | Design Rationale |
|---|---|---|
| `agent/models.py` | Typed Pydantic schemas for every pipeline entity | Guarantees type safety across detection, diagnosis, scheduling, and rich audit timeline events |
| `agent/rules_config.yaml` & `agent/rules_schema.py` | Single source of truth for decision policy, validated via Pydantic | Externalized YAML format reviewable by non-engineers (compliance, legal, risk ops) with atomic tempfile replacement |
| `agent/compliance.py` (`ComplianceAgent`) | Enforces RBI (24h pre-debit notice ≥ ₹5,000, revoked mandate stop), NPCI (24h spacing), TRAI (quiet hours 9PM–8AM), and DPDP (PII masking) | Dedicated regulatory isolation ensuring non-negotiable compliance |
| `integrations/gemini_client.py` (`DiagnosisAgent`) | Google Gemini 2.5 Flash reasoning core with structured JSON prompts and evidence extraction | Multi-pass root cause diagnosis and 2-way empathetic WhatsApp conversation with sentiment awareness |
| `integrations/bank_telemetry.py` (`SchedulingAgent`) | Bank switch uptime monitoring, clearing latency biases, and holiday scheduling | Models real Indian issuer clearing windows (HDFC, SBI, ICICI, Axis, Kotak, PNB) |
| `integrations/razorpay_client.py` | Razorpay Subscriptions, Payment Links, UPI Intent QR, and Smart Routing | Real API client in live mode; SHA-256 seeded deterministic simulator in sandbox with calibrated issuer curves |
| `data/retry_success_curves.py` | Root-cause-aware probability curves calibrated against Indian banking rails | Process-independent reproducible simulation matching empirical banking telemetry |
| `server/` | Modular FastAPI REST API (`routes/batch.py`, `routes/audit.py`, `routes/chat.py`, `routes/webhooks.py`, `routes/simulate.py`, `routes/config.py`) | Clean engineered API with HMAC-SHA256 signature verification, closed-loop webhook settlement, and admin key auth |
| `dashboard/` | Next.js + React + Tailwind + Recharts | Executive FinTech Command Center with real-time KPI metrics, visual funnel, interactive WhatsApp simulator, stress test arena, and audit inspector |

## Why Google Gemini 2.5 Flash + Deterministic Guardrails?

Payments engineering requires strict safety: an LLM must never hallucinate a 4th debit retry on a revoked mandate or contact a suspected fraudster.

1. **Deterministic Rule Engine (First Tier)**: High-confidence code lookup and regulatory stopping rules.
2. **Gemini 2.5 Flash Diagnostic Engine (Second Tier)**: Analyzes unstructured, ambiguous gateway failure messages, extracts verifiable evidence signals, and drives contextual customer conversations.
3. **Deterministic Guardrails**: The LLM *never* decides retry counts, cooldown hours, or regulatory stops. If confidence is low, safety-first rules automatically route to human ops.

## Regulatory Scope & Grievance Redressal (DPDP Act 2023)

- **PII Protection & Consent**: Real-time name and phone number masking are applied before records enter audit storage. Customer opt-outs (`RecordStatus.STOPPED`) immediately halt all future automated contact.
- **Grievance Redressal Architecture Note**: In full enterprise deployment, an explicit DPDP grievance-officer escalation path (`/api/compliance/grievance`) routes disputed transactions and consent audit records directly to the Data Protection Officer (DPO).
