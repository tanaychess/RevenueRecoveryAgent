"""
Pydantic validation schema for rules_config.yaml.

Guarantees playbook integrity and rejects invalid rule configurations at runtime or during PUT /api/config/rules.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ActionStepSchema(BaseModel):
    action: str
    delay_hours: float = 0.0

    @field_validator("action")
    @classmethod
    def validate_action_name(cls, v: str) -> str:
        valid_actions = {
            "retry_charge",
            "send_payment_link",
            "send_nudge",
            "smart_routing_fallback",
            "request_mandate_update",
            "escalate_human",
            "no_action",
        }
        if v not in valid_actions:
            raise ValueError(f"Invalid action '{v}'. Must be one of {sorted(valid_actions)}")
        return v


class PlaybookSchema(BaseModel):
    description: str
    action_sequence: List[ActionStepSchema]
    max_attempts: int = Field(ge=0, le=10)
    cooldown_hours: float = Field(ge=0)
    allow_customer_contact: bool = True
    smart_salary_boost: Optional[bool] = False
    stop_conditions: List[str] = Field(default_factory=list)
    compliance_note: Optional[str] = None


class ComplianceGuardrailsSchema(BaseModel):
    npci_emandate_min_spacing_hours: int = 24
    trai_quiet_hours_start_ist: int = 21
    trai_quiet_hours_end_ist: int = 8
    rbi_pre_debit_notification_hours: int = 24
    rbi_pre_debit_threshold_inr: float = 5000.0
    dpdp_pii_masking_enabled: bool = True
    fraud_zero_customer_contact: bool = True


class SmartSchedulingSchema(BaseModel):
    salary_cycle_days: List[int]
    peak_clearing_morning_start_ist: int = 6
    peak_clearing_morning_end_ist: int = 9
    peak_clearing_evening_start_ist: int = 19
    peak_clearing_evening_end_ist: int = 22


class RulesConfigSchema(BaseModel):
    version: int = 2
    global_max_attempts: int = Field(ge=1, le=10, default=4)
    global_cooldown_hours_min: int = Field(ge=0, default=1)
    classification_confidence_threshold: float = Field(ge=0.0, le=1.0, default=0.55)
    compliance_guardrails: ComplianceGuardrailsSchema
    smart_scheduling: SmartSchedulingSchema
    root_causes: Dict[str, PlaybookSchema]

    @field_validator("root_causes")
    @classmethod
    def must_contain_fallback_unknown(cls, v: Dict[str, PlaybookSchema]) -> Dict[str, PlaybookSchema]:
        if "unknown" not in v:
            raise ValueError("Configuration MUST contain an 'unknown' fallback playbook.")
        return v
