"""
Unit tests for Pydantic schema validation of rules_config.yaml.
"""

import pytest
import yaml
from pathlib import Path
from pydantic import ValidationError

from agent.rules_schema import RulesConfigSchema

CONFIG_PATH = Path(__file__).parent.parent / "agent" / "rules_config.yaml"


def test_production_rules_config_validates_cleanly():
    """Verify that agent/rules_config.yaml passes strict Pydantic validation."""
    assert CONFIG_PATH.exists(), "rules_config.yaml must exist"
    with open(CONFIG_PATH) as f:
        data = yaml.safe_load(f)
    validated = RulesConfigSchema.model_validate(data)
    assert validated.version == 2
    assert "insufficient_funds" in validated.root_causes
    assert "unknown" in validated.root_causes
    assert validated.global_max_attempts >= 1


def test_schema_rejects_invalid_action():
    """Verify schema rejects unknown or misspelled action types."""
    bad_config = {
        "version": 2,
        "global_max_attempts": 4,
        "global_cooldown_hours_min": 1,
        "compliance_guardrails": {
            "npci_emandate_min_spacing_hours": 24,
            "trai_quiet_hours_start_ist": 21,
            "trai_quiet_hours_end_ist": 8,
            "rbi_pre_debit_notification_hours": 24,
            "dpdp_pii_masking_enabled": True,
            "fraud_zero_customer_contact": True,
        },
        "smart_scheduling": {
            "salary_cycle_days": [1, 2, 3],
            "peak_clearing_morning_start_ist": 6,
            "peak_clearing_morning_end_ist": 9,
            "peak_clearing_evening_start_ist": 19,
            "peak_clearing_evening_end_ist": 22,
        },
        "root_causes": {
            "unknown": {
                "description": "Fallback",
                "action_sequence": [{"action": "invalid_magic_action", "delay_hours": 0}],
                "max_attempts": 0,
                "cooldown_hours": 0,
                "allow_customer_contact": False,
            }
        },
    }
    with pytest.raises(ValidationError):
        RulesConfigSchema.model_validate(bad_config)


def test_schema_rejects_missing_unknown_fallback():
    """Verify schema enforces the presence of an 'unknown' fallback playbook."""
    missing_unknown = {
        "version": 2,
        "global_max_attempts": 4,
        "global_cooldown_hours_min": 1,
        "compliance_guardrails": {
            "npci_emandate_min_spacing_hours": 24,
            "trai_quiet_hours_start_ist": 21,
            "trai_quiet_hours_end_ist": 8,
            "rbi_pre_debit_notification_hours": 24,
            "dpdp_pii_masking_enabled": True,
            "fraud_zero_customer_contact": True,
        },
        "smart_scheduling": {
            "salary_cycle_days": [1, 2, 3],
            "peak_clearing_morning_start_ist": 6,
            "peak_clearing_morning_end_ist": 9,
            "peak_clearing_evening_start_ist": 19,
            "peak_clearing_evening_end_ist": 22,
        },
        "root_causes": {
            "insufficient_funds": {
                "description": "Low balance",
                "action_sequence": [{"action": "retry_charge", "delay_hours": 24}],
                "max_attempts": 3,
                "cooldown_hours": 24,
                "allow_customer_contact": True,
            }
        },
    }
    with pytest.raises(ValidationError):
        RulesConfigSchema.model_validate(missing_unknown)
