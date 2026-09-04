"""
Data models for the Razorpay AI Revenue Recovery Agent 2.0 (Buildathon Edition).

Pydantic schemas ensuring typed integrity across the entire pipeline:
Detect -> Diagnose -> Decide -> Smart Schedule -> Act -> Audit -> Conversational Recovery.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RootCause(str, Enum):
    INSUFFICIENT_FUNDS = "insufficient_funds"
    CARD_EXPIRED = "card_expired"
    BANK_DECLINE_SOFT = "bank_decline_soft"
    MANDATE_REVOKED = "mandate_revoked"
    FRAUD_HOLD = "fraud_hold"
    TECHNICAL_TIMEOUT = "technical_timeout"
    UPI_PIN_LIMIT = "upi_pin_limit"
    UPI_APP_UNAVAILABLE = "upi_app_unavailable"
    MANDATE_PAUSED = "mandate_paused"
    COFT_TOKEN_EXPIRED = "coft_token_expired"
    NETBANKING_DOWN = "netbanking_down"
    AUTHENTICATION_FAILED_3DS = "authentication_failed_3ds"
    BNPL_LIMIT_EXCEEDED = "bnpl_limit_exceeded"
    WALLET_KYC_PENDING = "wallet_kyc_pending"
    UNKNOWN = "unknown"


class ActionType(str, Enum):
    RETRY_CHARGE = "retry_charge"
    SEND_PAYMENT_LINK = "send_payment_link"
    SEND_NUDGE = "send_nudge"
    SMART_ROUTING_FALLBACK = "smart_routing_fallback"
    REQUEST_MANDATE_UPDATE = "request_mandate_update"
    ESCALATE_HUMAN = "escalate_human"
    NO_ACTION = "no_action"


class RecordStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    RECOVERED = "recovered"
    ESCALATED = "escalated"
    STOPPED = "stopped"
    EXHAUSTED = "exhausted"
    SCHEDULED = "scheduled"
    CUSTOMER_PROMISED = "customer_promised"


class StopCondition(str, Enum):
    MAX_ATTEMPTS = "attempts >= max_attempts"
    ALWAYS_STOP_FIRST = "always_stop_after_first_action"
    CUSTOMER_OPTED_OUT = "customer_opted_out == true"
    PAYMENT_SUCCEEDED = "payment_succeeded == true"
    PROMISE_TO_PAY = "promise_to_pay_active"
    RBI_PRE_DEBIT_REQUIRED = "rbi_pre_debit_notification_required"


class PaymentMethod(str, Enum):
    UPI = "upi"
    UPI_AUTOPAY = "upi_autopay"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    NETBANKING = "netbanking"
    SUBSCRIPTION = "subscription"
    WALLET = "wallet"
    BNPL = "bnpl"


class SmartSchedule(BaseModel):
    recommended_time_iso: str
    delay_hours: float
    reason: str
    is_quiet_hours_delayed: bool = False
    salary_window_boost: bool = False
    peak_clearing_window: bool = False
    is_weekend_delayed: bool = False
    bank_clearing_speed_hours: float = 2.0


class TimelineEvent(BaseModel):
    timestamp_iso: str = Field(default_factory=lambda: datetime.now().isoformat())
    event_type: str  # "detected" | "diagnosed" | "action_taken" | "nudge_sent" | "payment_settled" | "escalated" | "scheduled"
    title: str
    description: str
    actor: str = "agent"  # "agent" | "razorpay_api" | "customer" | "compliance_engine"
    badge_variant: str = "blue"  # "blue" | "emerald" | "amber" | "rose" | "purple"


class PaymentRecord(BaseModel):
    payment_id: str
    customer_id: str
    customer_name: str
    customer_phone: str
    amount_paise: int
    currency: str = "INR"
    failure_code: str
    failure_message: str
    payment_method: PaymentMethod = PaymentMethod.SUBSCRIPTION
    bank_name: Optional[str] = "HDFC Bank"
    subscription_id: Optional[str] = None
    attempt_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    is_recurring: bool = False
    customer_tier: str = "Standard"  # VIP, Premium, Standard
    last_customer_response: Optional[str] = None
    promise_to_pay_date: Optional[str] = None
    customer_opted_out: bool = False
    pre_debit_notification_sent: bool = False
    history: List[Dict[str, Any]] = Field(default_factory=list)

    @property
    def amount_inr(self) -> float:
        return self.amount_paise / 100.0


class DiagnosisResult(BaseModel):
    payment_id: str
    root_cause: RootCause
    confidence: float
    reasoning: str
    classifier_used: str  # "gemini_llm" | "rule_based_fallback"
    evidence: List[str] = Field(default_factory=list)
    smart_schedule: Optional[SmartSchedule] = None


class Decision(BaseModel):
    payment_id: str
    root_cause: RootCause
    action: ActionType
    delay_hours: float = 0.0
    reason: str
    stop_condition_triggered: Optional[str] = None
    compliance_note: Optional[str] = None
    recommended_payment_method: Optional[str] = None
    offer_discount_pct: Optional[int] = None
    scheduled_for_iso: Optional[str] = None


class ActionResult(BaseModel):
    payment_id: str
    action: ActionType
    success: bool
    detail: str
    external_ref: Optional[str] = None
    amount_recovered_paise: int = 0
    channel: str = "razorpay_api"
    message_sent: Optional[str] = None
    quick_replies: List[str] = Field(default_factory=list)
    payment_link: Optional[str] = None
    upi_intent_uri: Optional[str] = None
    qr_payload: Optional[str] = None


class AuditLogEntry(BaseModel):
    id: Optional[int] = None
    payment_id: str
    customer_id: str
    customer_name_masked: str
    customer_phone_masked: str
    amount_paise: int
    payment_method: str = "subscription"
    bank_name: Optional[str] = "HDFC Bank"
    customer_tier: str = "Standard"
    root_cause: str
    confidence: float
    reasoning: str
    evidence: List[str] = Field(default_factory=list)
    action: str
    action_detail: str
    success: bool
    amount_recovered_paise: int
    status: RecordStatus
    stop_condition_triggered: Optional[str] = None
    compliance_tags: List[str] = Field(default_factory=list)
    payment_link: Optional[str] = None
    upi_intent_uri: Optional[str] = None
    offer_discount_pct: Optional[int] = None
    attempt_count: int = 0
    max_attempts: int = 4
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)


class PipelineFunnelMetrics(BaseModel):
    total_detected: int = 0
    total_diagnosed: int = 0
    scheduled_clearing: int = 0
    active_recovery_actions: int = 0
    recovered_successfully: int = 0
    quarantined_or_stopped: int = 0
    escalated_to_ops: int = 0


class BatchMetrics(BaseModel):
    batch_size: int = 0
    total_amount_at_risk_paise: int = 0
    total_amount_recovered_paise: int = 0
    recovery_rate: float = 0.0
    records_recovered: int = 0
    records_escalated: int = 0
    records_stopped: int = 0
    records_exhausted: int = 0
    records_scheduled: int = 0
    root_cause_breakdown: Dict[str, int] = Field(default_factory=dict)
    action_breakdown: Dict[str, int] = Field(default_factory=dict)
    channel_breakdown: Dict[str, int] = Field(default_factory=dict)
    false_escalation_estimate: int = 0
    averted_churn_inr: float = 0.0
    estimated_roi_multiple: float = 0.0
    funnel: Optional[PipelineFunnelMetrics] = None


class ChatReplyRequest(BaseModel):
    payment_id: str
    customer_message: str
    language: str = "Hinglish"
    customer_name: Optional[str] = "Rohan Mehta"
    amount_inr: Optional[float] = 1499.0
    payment_method: Optional[str] = "upi_autopay"
    customer_tier: Optional[str] = "VIP"
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)


class ChatReplyResponse(BaseModel):
    payment_id: str
    agent_reply: str
    intent_detected: str
    action_taken: str
    quick_replies: List[str] = Field(default_factory=list)
    updated_status: RecordStatus
    payment_link: Optional[str] = None
    upi_intent_uri: Optional[str] = None
    applied_discount_pct: Optional[int] = None
    language_used: str = "Hinglish"
    frustration_level: str = "low"
    reasoning_summary: Optional[str] = None


class CustomFailureRequest(BaseModel):
    customer_name: str = "Rohan Mehta"
    customer_phone: str = "9876543210"
    amount_inr: float = 1499.0
    payment_method: PaymentMethod = PaymentMethod.UPI_AUTOPAY
    bank_name: str = "HDFC Bank"
    failure_code: str = "UPI_PIN_LIMIT"
    failure_message: str = "Daily UPI transaction limit exceeded for this bank account."
    customer_tier: str = "Premium"


class ScenarioRequest(BaseModel):
    scenario_type: str = "mass_bank_outage"  # "mass_bank_outage" | "salary_day_surge" | "card_token_expiry"
    bank_name: str = "HDFC Bank"
    count: int = 25


class ResolvePaymentRequest(BaseModel):
    payment_id: str
    recovered_amount_paise: Optional[int] = None
    channel: str = "customer_payment_link"
