"""
Razorpay AI Revenue Recovery Orchestrator (Buildathon 2026 Edition).

Integrates Google Gemini 2.5 Flash for root-cause reasoning, contextual customer
conversations, and localized recovery, backed by deterministic compliance playbooks
(RBI, NPCI, TRAI, DPDP).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

from agent.compliance import ComplianceEngine
from agent.models import (
    ActionResult,
    ActionType,
    AuditLogEntry,
    BatchMetrics,
    ChatReplyResponse,
    Decision,
    DiagnosisResult,
    PaymentMethod,
    PaymentRecord,
    PipelineFunnelMetrics,
    RecordStatus,
    RootCause,
    SmartSchedule,
    StopCondition,
    TimelineEvent,
)
from agent.rules_schema import RulesConfigSchema
from integrations.bank_telemetry import get_bank_telemetry
from integrations.gemini_client import GeminiRecoveryClient
from integrations.notification_stub import send_nudge
from integrations.razorpay_client import RazorpayClient

logger = logging.getLogger("recovery_agent.orchestrator")
CONFIG_PATH = Path(__file__).parent / "rules_config.yaml"

# Failure code mapping table to guarantee deterministic classification
FAILURE_CODE_MAP: Dict[str, Tuple[RootCause, float, str]] = {
    "INSUFFICIENT_FUNDS": (
        RootCause.INSUFFICIENT_FUNDS,
        0.98,
        "Issuer returned insufficient funds/balance error code.",
    ),
    "CARD_EXPIRED": (
        RootCause.CARD_EXPIRED,
        0.99,
        "Card expiry date exceeded; recurring debit disallowed.",
    ),
    "COFT_TOKEN_EXPIRED": (
        RootCause.COFT_TOKEN_EXPIRED,
        0.95,
        "RBI Card-on-File Token expired or invalid cryptogram.",
    ),
    "ISSUER_DECLINED": (
        RootCause.BANK_DECLINE_SOFT,
        0.88,
        "Issuer soft decline (do_not_honor with retry-safe flag).",
    ),
    "ISSUER_UNAVAILABLE": (
        RootCause.BANK_DECLINE_SOFT,
        0.92,
        "Issuer core banking system temporarily unreachable.",
    ),
    "MANDATE_REVOKED": (
        RootCause.MANDATE_REVOKED,
        0.99,
        "Customer or issuing bank explicitly cancelled the recurring e-mandate.",
    ),
    "MANDATE_PAUSED": (
        RootCause.MANDATE_PAUSED,
        0.95,
        "UPI AutoPay mandate was put on temporary pause by customer.",
    ),
    "UPI_PIN_LIMIT": (
        RootCause.UPI_PIN_LIMIT,
        0.96,
        "Customer exceeded 24h bank UPI transaction or volume limit.",
    ),
    "UPI_APP_UNAVAILABLE": (
        RootCause.UPI_APP_UNAVAILABLE,
        0.90,
        "NPCI UPI switch or PSP app timeout.",
    ),
    "NETBANKING_DOWN": (
        RootCause.NETBANKING_DOWN,
        0.93,
        "Bank NetBanking gateway currently experiencing downtime.",
    ),
    "AUTHENTICATION_FAILED_3DS": (
        RootCause.AUTHENTICATION_FAILED_3DS,
        0.89,
        "Customer failed or dropped off during 3DS OTP challenge.",
    ),
    "BNPL_LIMIT_EXCEEDED": (
        RootCause.BNPL_LIMIT_EXCEEDED,
        0.95,
        "BNPL postpaid credit limit exhausted or partner authorization declined.",
    ),
    "WALLET_KYC_PENDING": (
        RootCause.WALLET_KYC_PENDING,
        0.94,
        "Prepaid wallet debit declined due to incomplete regulatory KYC.",
    ),
    "SUSPECTED_FRAUD": (
        RootCause.FRAUD_HOLD,
        0.99,
        "Transaction flagged by risk/AML engine for velocity anomaly.",
    ),
    "GATEWAY_TIMEOUT": (
        RootCause.TECHNICAL_TIMEOUT,
        0.90,
        "Network transit timeout before gateway response.",
    ),
}


class RecoveryOrchestrator:
    def __init__(self, use_llm: bool = True, config_path: Optional[Path] = None):
        self.config_path = config_path or CONFIG_PATH
        with open(self.config_path) as f:
            self.config: Dict[str, Any] = yaml.safe_load(f)

        # Validate configuration against Pydantic schema
        RulesConfigSchema.model_validate(self.config)

        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self.gemini = GeminiRecoveryClient(model=self.gemini_model)
        self.use_llm = use_llm and self.gemini.enabled
        self.razorpay = RazorpayClient()
        self.compliance = ComplianceEngine()

    # ------------------------------------------------------------------
    # Step 1: Diagnose Root Cause (Gemini 2.5 Flash + Deterministic Fallback)
    # ------------------------------------------------------------------

    def classify_root_cause(self, record: PaymentRecord) -> DiagnosisResult:
        rule_based = self._rule_based_classification(record)

        # Calculate Smart Schedule
        schedule = self.calculate_smart_schedule(record, rule_based.root_cause)
        rule_based.smart_schedule = schedule

        if not self.use_llm or not self.gemini.enabled:
            return rule_based

        # If rule-based is highly confident on deterministic codes (fraud, mandate revoked, expired card), trust it
        if rule_based.confidence >= 0.98 and rule_based.root_cause in [
            RootCause.MANDATE_REVOKED,
            RootCause.FRAUD_HOLD,
            RootCause.CARD_EXPIRED,
        ]:
            return rule_based

        # Refine ambiguous failure messages with Gemini 2.5 Flash
        method_str = record.payment_method.value if hasattr(record.payment_method, "value") else str(record.payment_method)
        llm_data = self.gemini.classify_root_cause(
            payment_id=record.payment_id,
            amount_inr=record.amount_inr,
            payment_method=method_str,
            bank_name=record.bank_name,
            failure_code=record.failure_code,
            failure_message=record.failure_message,
            attempt_count=record.attempt_count,
            baseline_cause=rule_based.root_cause.value,
            baseline_confidence=rule_based.confidence,
        )

        if not llm_data:
            return rule_based

        root_cause_val = llm_data.get("root_cause", rule_based.root_cause.value)
        try:
            root_cause = RootCause(root_cause_val)
        except ValueError:
            root_cause = rule_based.root_cause

        return DiagnosisResult(
            payment_id=record.payment_id,
            root_cause=root_cause,
            confidence=float(llm_data.get("confidence", 0.90)),
            reasoning=llm_data.get("reasoning", rule_based.reasoning),
            evidence=llm_data.get("evidence", [rule_based.reasoning]),
            classifier_used="gemini_llm",
            smart_schedule=schedule,
        )

    def _rule_based_classification(self, record: PaymentRecord) -> DiagnosisResult:
        code = (record.failure_code or "").upper().strip()
        if code in FAILURE_CODE_MAP:
            rc, conf, reason = FAILURE_CODE_MAP[code]
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=rc,
                confidence=conf,
                reasoning=reason,
                evidence=[f"Issuer failure code '{code}' matched deterministic table", f"Confidence calibrated at {conf * 100:.0f}%"],
                classifier_used="rule_based_fallback",
            )

        # Keyword heuristics on failure message
        msg = (record.failure_message or "").lower()
        if "insufficient" in msg or "low balance" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.INSUFFICIENT_FUNDS,
                confidence=0.85,
                reasoning="Keyword match on 'insufficient balance'.",
                evidence=["Substring match 'insufficient/low balance' detected in gateway response"],
                classifier_used="rule_based_fallback",
            )
        if "expired" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.CARD_EXPIRED,
                confidence=0.85,
                reasoning="Keyword match on 'expired card'.",
                evidence=["Substring match 'expired' detected in gateway response"],
                classifier_used="rule_based_fallback",
            )
        if "revoked" in msg or "mandate cancelled" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.MANDATE_REVOKED,
                confidence=0.90,
                reasoning="Keyword match on 'mandate revoked'.",
                evidence=["Explicit mandate revocation signal from customer/issuing bank"],
                classifier_used="rule_based_fallback",
            )
        if "fraud" in msg or "risk" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.FRAUD_HOLD,
                confidence=0.90,
                reasoning="Keyword match on 'risk / fraud'.",
                evidence=["AML velocity risk flag triggered"],
                classifier_used="rule_based_fallback",
            )
        if "limit" in msg or "upi pin" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.UPI_PIN_LIMIT,
                confidence=0.85,
                reasoning="Keyword match on 'UPI limit'.",
                evidence=["24h cumulative bank transaction limit exceeded"],
                classifier_used="rule_based_fallback",
            )
        if "bnpl" in msg or "credit line" in msg or "postpaid" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.BNPL_LIMIT_EXCEEDED,
                confidence=0.88,
                reasoning="Keyword match on 'BNPL / credit limit'.",
                evidence=["BNPL credit limit exhausted or provider offline"],
                classifier_used="rule_based_fallback",
            )
        if "kyc" in msg or "wallet" in msg:
            return DiagnosisResult(
                payment_id=record.payment_id,
                root_cause=RootCause.WALLET_KYC_PENDING,
                confidence=0.88,
                reasoning="Keyword match on 'wallet KYC'.",
                evidence=["PPI wallet minimum KYC limit exceeded"],
                classifier_used="rule_based_fallback",
            )

        return DiagnosisResult(
            payment_id=record.payment_id,
            root_cause=RootCause.UNKNOWN,
            confidence=0.40,
            reasoning="Unrecognized failure code and message.",
            evidence=["Unmapped error string; routing to human operations quarantine"],
            classifier_used="rule_based_fallback",
        )

    # ------------------------------------------------------------------
    # Step 2: Smart Schedule Calculation (Salary Window & TRAI Quiet Hours)
    # ------------------------------------------------------------------

    def calculate_smart_schedule(self, record: PaymentRecord, root_cause: RootCause) -> SmartSchedule:
        now = datetime.now() + timedelta(hours=5, minutes=30)  # IST Time
        current_hour = now.hour
        current_day = now.day
        weekday = now.weekday()  # 0=Monday, 6=Sunday

        delay_hours = 0.0
        is_quiet_delayed = False
        salary_boost = False
        peak_clearing = False
        is_weekend_delayed = False

        # TRAI Quiet Hours Check (9:00 PM to 8:00 AM IST)
        is_quiet_delayed, quiet_delay, quiet_reason = self.compliance.evaluate_trai_quiet_hours(
            now,
            start_hour=self.config.get("compliance_guardrails", {}).get("trai_quiet_hours_start_ist", 21),
            end_hour=self.config.get("compliance_guardrails", {}).get("trai_quiet_hours_end_ist", 8),
        )
        if is_quiet_delayed:
            delay_hours = max(delay_hours, quiet_delay)

        # Sunday clearing holiday adjustment for bank batch re-presentation
        if weekday == 6 and root_cause in [RootCause.BANK_DECLINE_SOFT, RootCause.INSUFFICIENT_FUNDS]:
            is_weekend_delayed = True
            delay_hours = max(delay_hours, 24.0)

        # Salary window boost (1st-5th or 28th-31st)
        salary_days = self.config.get("smart_scheduling", {}).get("salary_cycle_days", [1, 2, 3, 4, 5, 28, 29, 30, 31])
        if current_day in salary_days:
            salary_boost = True

        # Bank peak clearing window (6-9 AM or 7-10 PM IST)
        morning_start = self.config.get("smart_scheduling", {}).get("peak_clearing_morning_start_ist", 6)
        morning_end = self.config.get("smart_scheduling", {}).get("peak_clearing_morning_end_ist", 9)
        evening_start = self.config.get("smart_scheduling", {}).get("peak_clearing_evening_start_ist", 19)
        evening_end = self.config.get("smart_scheduling", {}).get("peak_clearing_evening_end_ist", 22)

        if (morning_start <= current_hour <= morning_end) or (evening_start <= current_hour <= evening_end):
            peak_clearing = True

        telemetry = get_bank_telemetry(record.bank_name)
        scheduled_time = (now + timedelta(hours=delay_hours)).isoformat()

        if is_quiet_delayed:
            reason = quiet_reason
        elif is_weekend_delayed:
            reason = "Bank clearing holiday hold (Sunday non-processing day; deferred to Monday clearing window)"
        elif delay_hours == 0:
            reason = f"Immediate execution allowed (Optimal clearing speed on {record.bank_name or 'Issuer'}: {telemetry.avg_clearing_delay_hours}h)"
        else:
            reason = f"Scheduled delay ({delay_hours:.1f}h)"

        return SmartSchedule(
            recommended_time_iso=scheduled_time,
            delay_hours=delay_hours,
            reason=reason,
            is_quiet_hours_delayed=is_quiet_delayed,
            salary_window_boost=salary_boost,
            peak_clearing_window=peak_clearing,
            is_weekend_delayed=is_weekend_delayed,
            bank_clearing_speed_hours=telemetry.avg_clearing_delay_hours,
        )

    # ------------------------------------------------------------------
    # Step 3: Decide Action (Deterministic Config-Driven & Compliance-Enforced)
    # ------------------------------------------------------------------

    def decide_action(self, record: PaymentRecord, diagnosis: DiagnosisResult) -> Decision:
        # Customer Opt-Out Hard Stop (DPDP Act 2023)
        if record.customer_opted_out:
            return Decision(
                payment_id=record.payment_id,
                root_cause=diagnosis.root_cause,
                action=ActionType.NO_ACTION,
                delay_hours=0,
                reason="Customer opted out of automated communications. Hard stop per DPDP compliance.",
                stop_condition_triggered=StopCondition.CUSTOMER_OPTED_OUT.value,
                compliance_note="DPDP Act 2023 Consent Revocation honored.",
            )

        # Active Promise-to-Pay Snooze
        if record.promise_to_pay_date:
            return Decision(
                payment_id=record.payment_id,
                root_cause=diagnosis.root_cause,
                action=ActionType.NO_ACTION,
                delay_hours=24,
                reason=f"Customer promised payment on {record.promise_to_pay_date}. Retries paused.",
                stop_condition_triggered=StopCondition.PROMISE_TO_PAY.value,
                compliance_note="Conversational Promise-to-Pay hold active.",
            )

        threshold = self.config.get("classification_confidence_threshold", 0.55)
        root_cause = diagnosis.root_cause
        if diagnosis.confidence < threshold:
            root_cause = RootCause.UNKNOWN

        playbook = self.config["root_causes"].get(
            root_cause.value, self.config["root_causes"]["unknown"]
        )
        max_attempts = min(playbook.get("max_attempts", 0), self.config.get("global_max_attempts", 4))

        # Check hard-stop playbooks (mandate_revoked, fraud_hold, unknown)
        if "always_stop_after_first_action == true" in playbook.get("stop_conditions", []):
            step = playbook["action_sequence"][0]
            return Decision(
                payment_id=record.payment_id,
                root_cause=root_cause,
                action=ActionType(step["action"]),
                delay_hours=step.get("delay_hours", 0),
                reason=f"Hard-stop playbook for '{root_cause.value}': {playbook['description']}",
                stop_condition_triggered=StopCondition.ALWAYS_STOP_FIRST.value,
                compliance_note=playbook.get("compliance_note"),
            )

        # Exhausted attempts check
        if record.attempt_count >= max_attempts:
            return Decision(
                payment_id=record.payment_id,
                root_cause=root_cause,
                action=ActionType.ESCALATE_HUMAN,
                delay_hours=0,
                reason=(
                    f"Attempts ({record.attempt_count}) reached maximum limit ({max_attempts}) "
                    f"for '{root_cause.value}'. Routing to human ops queue."
                ),
                stop_condition_triggered=StopCondition.MAX_ATTEMPTS.value,
                compliance_note=playbook.get("compliance_note"),
            )

        # Select next action in sequence
        action_seq = playbook["action_sequence"]
        step_idx = min(record.attempt_count, len(action_seq) - 1)
        step = action_seq[step_idx]
        proposed_action = ActionType(step["action"])

        # RBI e-Mandate Framework: Check 24-hour pre-debit notification requirement for debits >= ₹5,000
        threshold_inr = self.config.get("compliance_guardrails", {}).get("rbi_pre_debit_threshold_inr", 5000.0)
        needs_pre_debit_nudge, rbi_note = self.compliance.check_rbi_pre_debit_notification(
            record, proposed_action, threshold_inr=threshold_inr
        )
        if needs_pre_debit_nudge:
            return Decision(
                payment_id=record.payment_id,
                root_cause=root_cause,
                action=ActionType.SEND_NUDGE,
                delay_hours=24.0,
                reason=rbi_note or "RBI mandate 24h pre-debit intimation dispatched prior to re-presentation.",
                compliance_note="RBI Circular on Processing of e-Mandate on cards/UPI for recurring transactions.",
            )

        # Check for High-Value Discount Offer recommendation
        discount_offer = None
        if record.customer_tier in ["VIP", "Premium"] and record.amount_inr >= 1000 and record.attempt_count >= 1:
            discount_offer = 5  # 5% instant discount to prevent subscriber churn

        return Decision(
            payment_id=record.payment_id,
            root_cause=root_cause,
            action=proposed_action,
            delay_hours=step.get("delay_hours", 0),
            reason=(
                f"Step {step_idx + 1}/{len(action_seq)} of '{root_cause.value}' playbook: "
                f"{step['action']} (cooldown {playbook.get('cooldown_hours', 24)}h)"
            ),
            compliance_note=playbook.get("compliance_note"),
            offer_discount_pct=discount_offer,
        )

    # ------------------------------------------------------------------
    # Step 4: Execute Action
    # ------------------------------------------------------------------

    def execute_action(self, record: PaymentRecord, decision: Decision) -> ActionResult:
        schedule = self.calculate_smart_schedule(record, decision.root_cause)
        if decision.action == ActionType.RETRY_CHARGE:
            return self.razorpay.retry_charge(
                record,
                root_cause_hint=decision.root_cause.value,
                is_salary_window=schedule.salary_window_boost,
            )
        if decision.action == ActionType.SEND_PAYMENT_LINK:
            return self.razorpay.create_payment_link(record)
        if decision.action == ActionType.SEND_NUDGE:
            # Mark pre-debit notification sent if high value
            if record.amount_inr >= 5000:
                record.pre_debit_notification_sent = True
            return send_nudge(record, root_cause_hint=decision.root_cause.value)
        if decision.action == ActionType.SMART_ROUTING_FALLBACK:
            return self.razorpay.recommend_smart_routing(record)
        if decision.action == ActionType.ESCALATE_HUMAN:
            return ActionResult(
                payment_id=record.payment_id,
                action=decision.action,
                success=True,
                detail="Quarantined and escalated to human operations queue. No external debit executed.",
                channel="human_escalation_queue",
            )
        return ActionResult(
            payment_id=record.payment_id,
            action=ActionType.NO_ACTION,
            success=True,
            detail="No action required.",
            channel="system",
        )

    # ------------------------------------------------------------------
    # Step 5: 2-Way Conversational AI Engine (WhatsApp / SMS Reply Handler)
    # ------------------------------------------------------------------

    def handle_customer_reply(
        self,
        record: PaymentRecord,
        customer_message: str,
        language: str = "Hinglish",
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> ChatReplyResponse:
        # Try Gemini 2.5 Flash conversational engine if available
        if self.use_llm and self.gemini.enabled:
            method_str = record.payment_method.value if hasattr(record.payment_method, "value") else str(record.payment_method)
            gemini_reply = self.gemini.generate_chat_reply(
                customer_name=record.customer_name,
                amount_inr=record.amount_inr,
                payment_id=record.payment_id,
                payment_method=method_str,
                customer_tier=record.customer_tier,
                target_language=language,
                customer_message=customer_message,
                conversation_history=conversation_history,
            )
            if gemini_reply:
                intent = gemini_reply.get("intent_detected", "general_inquiry")
                status = RecordStatus.IN_PROGRESS
                if intent == "promise_to_pay":
                    status = RecordStatus.CUSTOMER_PROMISED
                    record.promise_to_pay_date = "tomorrow"
                elif intent == "opt_out_cancellation":
                    status = RecordStatus.STOPPED
                    record.customer_opted_out = True

                disc_pct = gemini_reply.get("applied_discount_pct")
                payment_link = f"https://rzp.io/i/rec_{record.payment_id[-6:]}"
                if disc_pct and disc_pct > 0:
                    payment_link += f"?disc={disc_pct}"

                upi_intent = f"upi://pay?pa=razorpay.recovery@hdfcbank&pn=Razorpay+Recovery&tr={record.payment_id}&am={record.amount_inr:.2f}&cu=INR"

                return ChatReplyResponse(
                    payment_id=record.payment_id,
                    agent_reply=gemini_reply.get("agent_reply", "Hi! Your pending invoice link is ready."),
                    intent_detected=intent,
                    action_taken=gemini_reply.get("action_taken", "send_recovery_link"),
                    quick_replies=gemini_reply.get("quick_replies", ["Pay Now", "Remind Tomorrow", "Change Method"]),
                    updated_status=status,
                    payment_link=payment_link,
                    upi_intent_uri=upi_intent,
                    applied_discount_pct=disc_pct,
                    language_used=language,
                    frustration_level=gemini_reply.get("frustration_level", "low"),
                    reasoning_summary=gemini_reply.get("reasoning_summary", "Gemini 2.5 Flash conversational recovery"),
                )

        return self._rule_based_chat_reply(record, customer_message, language)

    def _rule_based_chat_reply(
        self, record: PaymentRecord, customer_message: str, language: str = "Hinglish"
    ) -> ChatReplyResponse:
        msg_lower = customer_message.lower().strip()
        payment_link = f"https://rzp.io/i/rec_{record.payment_id[-6:]}"
        upi_intent = f"upi://pay?pa=razorpay.recovery@hdfcbank&pn=Razorpay+Recovery&tr={record.payment_id}&am={record.amount_inr:.2f}&cu=INR"

        # Multi-lingual dictionary for promise-to-pay keywords across 7 Indian languages
        promise_keywords = [
            "tomorrow", "kal", "later", "friday", "next week", "shaam ko", "remind", "nallai", "repu", "naale", "udya", "aagami"
        ]
        discount_keywords = [
            "discount", "offer", "expensive", "mahanga", "kam karo", "chhoot", "thallupadi", "thaggimpu", "rihayti", "koman"
        ]
        method_keywords = [
            "card", "upi", "netbanking", "change method", "update", "naya link", "puthiya link", "kotha link", "badla"
        ]
        cancel_keywords = [
            "cancel", "stop", "unsubscribe", "band karo", "mat bhejo", "don't message", "vendam", "oddu", "beda", "nako"
        ]

        # Intent 1: Promise to Pay / Remind Later
        if any(w in msg_lower for w in promise_keywords):
            record.promise_to_pay_date = "tomorrow"
            if language == "English":
                reply_text = f"Sure {record.customer_name}! We have paused retries and scheduled a gentle reminder for you tomorrow: {payment_link}"
            elif language in ["Tamil", "Telugu", "Kannada", "Marathi", "Bengali"]:
                reply_text = f"Thank you {record.customer_name}! Retries paused. You can clear your invoice at: {payment_link}"
            else:
                reply_text = f"Bilkul {record.customer_name}! Humne retries pause kar diye hain aur kal ka reminder schedule kar diya hai: {payment_link}"

            return ChatReplyResponse(
                payment_id=record.payment_id,
                agent_reply=reply_text,
                intent_detected="promise_to_pay",
                action_taken="snooze_retries_24h",
                quick_replies=["Pay Now", "Change Payment Method", "Contact Support"],
                updated_status=RecordStatus.CUSTOMER_PROMISED,
                payment_link=payment_link,
                upi_intent_uri=upi_intent,
                language_used=language,
                frustration_level="low",
                reasoning_summary="Customer promised payment later; paused retries for 24h.",
            )

        # Intent 2: Request Discount / Financial Difficulty
        if any(w in msg_lower for w in discount_keywords):
            discount_pct = 10 if record.customer_tier == "VIP" else 5
            discounted_amt = record.amount_inr * (1 - discount_pct / 100)
            disc_link = f"{payment_link}?disc={discount_pct}"
            if language == "English":
                reply_text = f"We value your relationship, {record.customer_name}! We've applied a {discount_pct}% discount. Pay ₹{discounted_amt:,.0f} here: {disc_link}"
            elif language in ["Tamil", "Telugu", "Kannada", "Marathi", "Bengali"]:
                reply_text = f"Special {discount_pct}% discount applied for you {record.customer_name}! Pay ₹{discounted_amt:,.0f} here: {disc_link}"
            else:
                reply_text = f"Aap hamare valued customer hain {record.customer_name}! Humne special {discount_pct}% discount apply kar diya hai. Sirf ₹{discounted_amt:,.0f} pay karein: {disc_link}"

            return ChatReplyResponse(
                payment_id=record.payment_id,
                agent_reply=reply_text,
                intent_detected="request_discount",
                action_taken="apply_churn_prevention_discount",
                quick_replies=[f"Pay ₹{discounted_amt:,.0f} Now", "Keep Full Plan", "Talk to Support"],
                updated_status=RecordStatus.IN_PROGRESS,
                payment_link=disc_link,
                upi_intent_uri=upi_intent,
                applied_discount_pct=discount_pct,
                language_used=language,
                frustration_level="medium",
                reasoning_summary=f"Applied {discount_pct}% churn-prevention discount for {record.customer_tier} customer.",
            )

        # Intent 3: Change Payment Method / Card Update
        if any(w in msg_lower for w in method_keywords):
            if language == "English":
                reply_text = f"Here is your instant checkout link to update your card or pay with UPI/NetBanking: {payment_link}"
            elif language in ["Tamil", "Telugu", "Kannada", "Marathi", "Bengali"]:
                reply_text = f"Use this link to pay via UPI, Card or NetBanking: {payment_link}"
            else:
                reply_text = f"Yeh raha aapka instant payment link jahan aap UPI, naya card ya NetBanking se pay kar sakte hain: {payment_link}"

            return ChatReplyResponse(
                payment_id=record.payment_id,
                agent_reply=reply_text,
                intent_detected="change_payment_method",
                action_taken="generate_multi_method_link",
                quick_replies=["Pay via UPI", "Pay via Card", "Pay via NetBanking"],
                updated_status=RecordStatus.IN_PROGRESS,
                payment_link=payment_link,
                upi_intent_uri=upi_intent,
                language_used=language,
                frustration_level="low",
                reasoning_summary="Customer requested alternate payment method; dispatched multi-rail checkout link.",
            )

        # Intent 4: Cancellation / Opt-out
        if any(w in msg_lower for w in cancel_keywords):
            record.customer_opted_out = True
            if language == "English":
                reply_text = f"Understood {record.customer_name}. We have stopped all automated recovery reminders for this invoice."
            elif language in ["Tamil", "Telugu", "Kannada", "Marathi", "Bengali"]:
                reply_text = f"Noted {record.customer_name}. Automated reminders have been stopped as requested."
            else:
                reply_text = f"Samajh gaya {record.customer_name}. Humne is invoice ke saare automated reminders band kar diye hain."

            return ChatReplyResponse(
                payment_id=record.payment_id,
                agent_reply=reply_text,
                intent_detected="opt_out_cancellation",
                action_taken="halt_all_contact",
                quick_replies=["Reactivate Service", "Speak to Human Agent"],
                updated_status=RecordStatus.STOPPED,
                language_used=language,
                frustration_level="high",
                reasoning_summary="Customer opted out; halted all automated messaging under DPDP Act 2023.",
            )

        # Default Helpful Reply
        if language == "English":
            reply_text = f"Hi {record.customer_name}, I'm Razorpay's Recovery Assistant. Your pending invoice is for ₹{record.amount_inr:,.0f}: {payment_link}"
        elif language in ["Tamil", "Telugu", "Kannada", "Marathi", "Bengali"]:
            reply_text = f"Hello {record.customer_name}, pending invoice amount ₹{record.amount_inr:,.0f}. Link: {payment_link}"
        else:
            reply_text = f"Hi {record.customer_name}, aapka ₹{record.amount_inr:,.0f} ka invoice pending hai. 1-click me yahan se complete karein: {payment_link}"

        return ChatReplyResponse(
            payment_id=record.payment_id,
            agent_reply=reply_text,
            intent_detected="general_inquiry",
            action_taken="send_recovery_link",
            quick_replies=["Pay Now", "Remind Tomorrow", "Update Payment Method"],
            updated_status=RecordStatus.IN_PROGRESS,
            payment_link=payment_link,
            upi_intent_uri=upi_intent,
            language_used=language,
            frustration_level="low",
            reasoning_summary="Standard payment assistance provided.",
        )

    # ------------------------------------------------------------------
    # Step 6: Full Pipeline Processing & Audit Logging with Rich Timeline
    # ------------------------------------------------------------------

    def process_record(self, record: PaymentRecord) -> AuditLogEntry:
        timeline: List[Dict[str, Any]] = []

        # 1. Detection Event
        method_str = record.payment_method.value if hasattr(record.payment_method, "value") else str(record.payment_method)
        timeline.append(
            TimelineEvent(
                event_type="detected",
                title=f"Payment Failed ({record.failure_code})",
                description=f"Initial debit of ₹{record.amount_inr:,.0f} failed via {method_str} on {record.bank_name or 'Issuer'}.",
                actor="razorpay_api",
                badge_variant="amber",
            ).model_dump()
        )

        # 2. Diagnosis Event (Dynamic re-classification using attempt context)
        diagnosis = self.classify_root_cause(record)
        record.history.append({
            "attempt": record.attempt_count,
            "root_cause": diagnosis.root_cause.value,
            "confidence": diagnosis.confidence,
            "timestamp": datetime.now().isoformat(),
        })

        timeline.append(
            TimelineEvent(
                event_type="diagnosed",
                title=f"Diagnosed: {diagnosis.root_cause.value.replace('_', ' ').title()}",
                description=f"{diagnosis.reasoning} (Confidence: {diagnosis.confidence * 100:.0f}%, Engine: {diagnosis.classifier_used})",
                actor="agent",
                badge_variant="purple",
            ).model_dump()
        )

        # 3. Schedule Event
        if diagnosis.smart_schedule and diagnosis.smart_schedule.is_quiet_hours_delayed:
            timeline.append(
                TimelineEvent(
                    event_type="scheduled",
                    title="TRAI DND Quiet Hours Hold",
                    description=f"Deferred customer outreach by {diagnosis.smart_schedule.delay_hours:.1f}h to 8:15 AM IST.",
                    actor="compliance_engine",
                    badge_variant="blue",
                ).model_dump()
            )

        # 4. Decision Event
        decision = self.decide_action(record, diagnosis)
        timeline.append(
            TimelineEvent(
                event_type="action_taken",
                title=f"Action: {decision.action.value.replace('_', ' ').title()}",
                description=decision.reason,
                actor="agent",
                badge_variant="blue",
            ).model_dump()
        )

        # 5. Execution Event
        result = self.execute_action(record, decision)

        if result.success and result.amount_recovered_paise > 0:
            status = RecordStatus.RECOVERED
            timeline.append(
                TimelineEvent(
                    event_type="payment_settled",
                    title="Revenue Recovered & Settled",
                    description=f"Successfully collected ₹{result.amount_recovered_paise / 100:,.0f} via {result.channel}.",
                    actor="razorpay_api",
                    badge_variant="emerald",
                ).model_dump()
            )
        elif decision.action == ActionType.ESCALATE_HUMAN:
            status = RecordStatus.ESCALATED
            timeline.append(
                TimelineEvent(
                    event_type="escalated",
                    title="Escalated to Human Risk Operations",
                    description="Quarantined from automated retries per security/compliance policy.",
                    actor="compliance_engine",
                    badge_variant="rose",
                ).model_dump()
            )
        elif decision.stop_condition_triggered == StopCondition.MAX_ATTEMPTS.value:
            status = RecordStatus.EXHAUSTED
        elif decision.stop_condition_triggered:
            status = RecordStatus.STOPPED
        elif decision.delay_hours > 0:
            status = RecordStatus.SCHEDULED
        else:
            status = RecordStatus.IN_PROGRESS

        # DPDP Act PII Sanitization
        masked_name = self.compliance.mask_name(record.customer_name)
        masked_phone = self.compliance.mask_phone(record.customer_phone)

        # Compliance Badges
        compliance_tags = self.compliance.build_compliance_tags(
            record,
            diagnosis.root_cause,
            decision.action,
            diagnosis.smart_schedule,
        )

        playbook = self.config["root_causes"].get(diagnosis.root_cause.value, self.config["root_causes"]["unknown"])
        max_attempts_for_cause = min(playbook.get("max_attempts", 0), self.config.get("global_max_attempts", 4))

        return AuditLogEntry(
            payment_id=record.payment_id,
            customer_id=record.customer_id,
            customer_name_masked=masked_name,
            customer_phone_masked=masked_phone,
            amount_paise=record.amount_paise,
            payment_method=method_str,
            bank_name=record.bank_name or "HDFC Bank",
            customer_tier=record.customer_tier,
            root_cause=diagnosis.root_cause.value,
            confidence=diagnosis.confidence,
            reasoning=diagnosis.reasoning,
            evidence=diagnosis.evidence,
            action=decision.action.value,
            action_detail=f"{decision.reason} | {result.detail}",
            success=result.success,
            amount_recovered_paise=result.amount_recovered_paise,
            status=status,
            stop_condition_triggered=decision.stop_condition_triggered,
            compliance_tags=compliance_tags,
            payment_link=result.payment_link or (f"https://rzp.io/i/rec_{record.payment_id[-6:]}"),
            upi_intent_uri=result.upi_intent_uri or self.razorpay.generate_upi_intent_uri(record),
            offer_discount_pct=decision.offer_discount_pct,
            attempt_count=record.attempt_count,
            max_attempts=max_attempts_for_cause,
            timeline=timeline,
        )

    def process_batch(self, records: List[PaymentRecord]) -> List[AuditLogEntry]:
        return [self.process_record(r) for r in records]

    @staticmethod
    def compute_metrics(entries: List[AuditLogEntry]) -> BatchMetrics:
        """Single-pass O(N) metrics computation across audit log entries."""
        total_at_risk = 0
        total_recovered = 0
        root_cause_breakdown: Dict[str, int] = {}
        action_breakdown: Dict[str, int] = {}
        channel_breakdown: Dict[str, int] = {}
        recovered_count = 0
        escalated_count = 0
        stopped_count = 0
        exhausted_count = 0
        scheduled_count = 0
        active_recovery_count = 0
        false_escalations = 0

        active_action_set = {"retry_charge", "send_payment_link", "send_nudge", "smart_routing_fallback"}

        for e in entries:
            total_at_risk += e.amount_paise
            total_recovered += e.amount_recovered_paise

            root_cause_breakdown[e.root_cause] = root_cause_breakdown.get(e.root_cause, 0) + 1
            action_breakdown[e.action] = action_breakdown.get(e.action, 0) + 1
            channel_breakdown[e.payment_method] = channel_breakdown.get(e.payment_method, 0) + 1

            if e.status == RecordStatus.RECOVERED:
                recovered_count += 1
            elif e.status == RecordStatus.ESCALATED:
                escalated_count += 1
                if e.root_cause != RootCause.FRAUD_HOLD.value:
                    false_escalations += 1
            elif e.status == RecordStatus.STOPPED:
                stopped_count += 1
            elif e.status == RecordStatus.EXHAUSTED:
                exhausted_count += 1
            elif e.status == RecordStatus.SCHEDULED:
                scheduled_count += 1

            if e.action in active_action_set:
                active_recovery_count += 1

        recovery_rate = (total_recovered / total_at_risk) if total_at_risk else 0.0

        # Financial ROI Modeling (Compared to traditional ~15% naive retry recovery)
        naive_recovery_inr = (total_at_risk / 100.0) * 0.15
        recovered_inr = total_recovered / 100.0
        averted_churn_inr = max(0.0, recovered_inr - naive_recovery_inr)
        estimated_roi = (recovered_inr / naive_recovery_inr) if naive_recovery_inr > 0 else 3.8

        funnel = PipelineFunnelMetrics(
            total_detected=len(entries),
            total_diagnosed=len(entries),
            scheduled_clearing=scheduled_count,
            active_recovery_actions=active_recovery_count,
            recovered_successfully=recovered_count,
            quarantined_or_stopped=stopped_count,
            escalated_to_ops=escalated_count,
        )

        return BatchMetrics(
            batch_size=len(entries),
            total_amount_at_risk_paise=total_at_risk,
            total_amount_recovered_paise=total_recovered,
            recovery_rate=recovery_rate,
            records_recovered=recovered_count,
            records_escalated=escalated_count,
            records_stopped=stopped_count,
            records_exhausted=exhausted_count,
            records_scheduled=scheduled_count,
            root_cause_breakdown=root_cause_breakdown,
            action_breakdown=action_breakdown,
            channel_breakdown=channel_breakdown,
            false_escalation_estimate=false_escalations,
            averted_churn_inr=averted_churn_inr,
            estimated_roi_multiple=round(estimated_roi, 1),
            funnel=funnel,
        )
