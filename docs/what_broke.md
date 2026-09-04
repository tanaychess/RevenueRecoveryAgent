# What Broke, How We Recovered, and Engineering Iterations (Buildathon 2026)

Here is a genuine technical breakdown of the architectural hurdles, regulatory edge-cases, and closed feedback loops encountered while developing the Razorpay AI Revenue Recovery Agent 2.0.

---

## 1. Retrying a "Failed" Payment Isn't Always Safe — Compliance-First Architecture

Early in designing the decision table, the first draft of `rules_config.yaml` used a single generic retry playbook for every failure code, with the same 3-attempt, 24h-cooldown sequence applied uniformly. That's the obvious naive design — and it's wrong for at least four root causes:

- **`mandate_revoked`**: Retrying a debit against a mandate the customer explicitly cancelled isn't just bad UX; it violates RBI and NPCI circulars.
- **`fraud_hold`**: Auto-contacting a customer on a suspected-fraud transaction can tip off bad actors before risk review.
- **`card_expired` & `coft_token_expired`**: Immediate charge retries degrade merchant issuer reputation.
- **RBI e-Mandate Threshold (≥ ₹5,000)**: Recurring debits exceeding ₹5,000 require a 24-hour pre-debit intimation under RBI regulations before debit execution.

**Resolution:**
- Split the decision engine into distinct per-root-cause playbooks with explicit `max_attempts: 0` and `always_stop_after_first_action` for hard stops.
- Implemented `ComplianceEngine` (`agent/compliance.py`) with strict RBI pre-debit checks, NPCI 24h presentation spacing, TRAI quiet-hours rescheduling, and DPDP PII masking.
- Pinned these rules down with comprehensive unit tests (`tests/test_stopping_rules.py` and `tests/test_compliance_and_webhooks.py`).

---

## 2. Gemini LLM Degradation Resilience & Discontinued Model Upgrades

1. **Model Discontinuation Fix**:
   - Google Gemini 2.0 Flash was sunsetted on June 1, 2026. We upgraded the default reasoning model to **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) with dynamic fallback handling.
   - Built a boot-time self-check probe (`GeminiRecoveryClient.check_connectivity()`) that surfaces `llm_last_check` on the `/health` diagnostic endpoint.

2. **Graceful Zero-Key Degradation**:
   - Wrapped all LLM calls in safe try-catch blocks with full deterministic rule-based fallbacks.
   - If an API key is missing or encounters network timeouts, the pipeline seamlessly falls back to deterministic decision tables, ensuring 100% demo reliability offline.

---

## 3. "Deterministic" Simulation Salt Randomness & SHA-256 Calibration

Python's built-in `hash()` on strings is salted randomly per process (`PYTHONHASHSEED`), causing simulated sandbox outcomes to vary across process restarts.

**Resolution:**
- Built `data/retry_success_curves.py` using SHA-256 integer seeding (`hashlib.sha256(f"{payment_id}:{attempt_count}:{salt}".encode()).hexdigest()[:8]`), guaranteeing identical, reproducible numbers across every environment restart.
- Replaced flat success probabilities with root-cause-aware curves:
  - `bank_decline_soft`: Ramps up on attempt 2-3 as clearing windows reset.
  - `insufficient_funds`: Spikes during salary credit days (1st-5th / 28th-31st).
  - Hard stops (`card_expired`, `mandate_revoked`, `fraud_hold`): Return 0.0% retry probability.

---

## 4. Closed Loops Completed for Buildathon 2026

1. **Closed-Loop Webhook Settlement**:
   - `POST /api/webhooks/razorpay` now enforces HMAC-SHA256 signature verification and auto-settles payments on `payment_link.paid` and `payment.captured` events, updating audit rows and timelines in real-time.
2. **Dynamic Re-Classification on Retry**:
   - Payment failure histories are now tracked across attempts in `PaymentRecord.history`, allowing multi-pass re-evaluation as failure signals evolve.
3. **Pydantic Rules Validation & Atomic Backup**:
   - `PUT /api/config/rules` validates incoming YAML with `RulesConfigSchema`, rejects malformed payloads with `422`, performs atomic file replacement, and provides a 1-click "Reset to Defaults" option.
4. **Expanded Rail Coverage**:
   - Added support for `BNPL_LIMIT_EXCEEDED` and `WALLET_KYC_PENDING` root causes and playbooks.
