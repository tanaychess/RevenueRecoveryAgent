"""Tests for root-cause classification, payment method routing, and smart scheduling."""

from datetime import datetime
import pytest

from agent.models import ActionType, PaymentMethod, PaymentRecord, RootCause
from agent.orchestrator import RecoveryOrchestrator


def make_record(**overrides) -> PaymentRecord:
    defaults = dict(
        payment_id="pay_test002",
        customer_id="cust_test2",
        customer_name="Priya Sharma",
        customer_phone="9812345678",
        amount_paise=149900,
        currency="INR",
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Payment failed due to insufficient balance.",
        payment_method=PaymentMethod.UPI_AUTOPAY,
        bank_name="HDFC Bank",
        subscription_id=None,
        attempt_count=0,
        created_at=datetime(2026, 8, 25),
        is_recurring=False,
    )
    defaults.update(overrides)
    return PaymentRecord(**defaults)


@pytest.fixture
def orchestrator():
    return RecoveryOrchestrator(use_llm=False)


def test_rule_based_classification_maps_all_known_codes(orchestrator):
    mappings = [
        ("INSUFFICIENT_FUNDS", RootCause.INSUFFICIENT_FUNDS),
        ("CARD_EXPIRED", RootCause.CARD_EXPIRED),
        ("COFT_TOKEN_EXPIRED", RootCause.COFT_TOKEN_EXPIRED),
        ("ISSUER_DECLINED", RootCause.BANK_DECLINE_SOFT),
        ("MANDATE_REVOKED", RootCause.MANDATE_REVOKED),
        ("MANDATE_PAUSED", RootCause.MANDATE_PAUSED),
        ("UPI_PIN_LIMIT", RootCause.UPI_PIN_LIMIT),
        ("UPI_APP_UNAVAILABLE", RootCause.UPI_APP_UNAVAILABLE),
        ("NETBANKING_DOWN", RootCause.NETBANKING_DOWN),
        ("AUTHENTICATION_FAILED_3DS", RootCause.AUTHENTICATION_FAILED_3DS),
        ("SUSPECTED_FRAUD", RootCause.FRAUD_HOLD),
        ("GATEWAY_TIMEOUT", RootCause.TECHNICAL_TIMEOUT),
    ]
    for code, expected_rc in mappings:
        record = make_record(failure_code=code)
        diagnosis = orchestrator.classify_root_cause(record)
        assert diagnosis.root_cause == expected_rc
        assert diagnosis.confidence >= 0.85


def test_upi_pin_limit_notifies_and_snoozes(orchestrator):
    record = make_record(failure_code="UPI_PIN_LIMIT", payment_method=PaymentMethod.UPI)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.SEND_NUDGE
    assert decision.root_cause == RootCause.UPI_PIN_LIMIT


def test_coft_token_expired_generates_payment_link(orchestrator):
    record = make_record(failure_code="COFT_TOKEN_EXPIRED", payment_method=PaymentMethod.CREDIT_CARD)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.SEND_PAYMENT_LINK


def test_netbanking_down_triggers_smart_routing(orchestrator):
    record = make_record(failure_code="NETBANKING_DOWN", payment_method=PaymentMethod.NETBANKING)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.SMART_ROUTING_FALLBACK


def test_card_expired_never_retries_immediately(orchestrator):
    record = make_record(failure_code="CARD_EXPIRED", attempt_count=0)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.SEND_PAYMENT_LINK


def test_unknown_failure_code_routes_to_unknown_and_escalates(orchestrator):
    record = make_record(failure_code="TOTALLY_NEW_UNMAPPED_ERROR", failure_message="weird edge case")
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.ESCALATE_HUMAN
    assert decision.root_cause == RootCause.UNKNOWN


def test_smart_scheduling_output(orchestrator):
    record = make_record(failure_code="INSUFFICIENT_FUNDS")
    schedule = orchestrator.calculate_smart_schedule(record, RootCause.INSUFFICIENT_FUNDS)
    assert schedule.recommended_time_iso
    assert isinstance(schedule.delay_hours, (int, float))
    assert schedule.reason
