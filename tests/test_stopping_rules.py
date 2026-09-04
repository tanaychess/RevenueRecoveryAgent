"""
Tests specifically proving stopping rules, compliance guardrails,
and regulatory constraints (RBI, NPCI, TRAI, DPDP).
"""

from datetime import datetime
import pytest

from agent.models import ActionType, PaymentMethod, PaymentRecord
from agent.orchestrator import RecoveryOrchestrator


def make_record(**overrides) -> PaymentRecord:
    defaults = dict(
        payment_id="pay_test001",
        customer_id="cust_test1",
        customer_name="Rohan Mehta",
        customer_phone="9876543210",
        amount_paise=99900,
        currency="INR",
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Payment failed due to insufficient balance.",
        payment_method=PaymentMethod.UPI_AUTOPAY,
        subscription_id=None,
        attempt_count=0,
        created_at=datetime(2026, 8, 25),
        is_recurring=True,
    )
    defaults.update(overrides)
    return PaymentRecord(**defaults)


@pytest.fixture
def orchestrator():
    return RecoveryOrchestrator(use_llm=False)


def test_mandate_revoked_never_retries(orchestrator):
    """Compliance-critical: retrying a debit against a revoked mandate is
    strictly prohibited by RBI/NPCI, regardless of attempt count."""
    for attempts in (0, 1, 3, 5):
        record = make_record(failure_code="MANDATE_REVOKED", attempt_count=attempts)
        diagnosis = orchestrator.classify_root_cause(record)
        decision = orchestrator.decide_action(record, diagnosis)
        assert decision.action != ActionType.RETRY_CHARGE
        assert decision.stop_condition_triggered == "always_stop_after_first_action"
        assert decision.action == ActionType.SEND_PAYMENT_LINK


def test_fraud_hold_never_contacts_customer_or_retries(orchestrator):
    """Compliance-critical: suspected fraud transactions must immediately be
    quarantined with zero customer contact to avoid tipping off bad actors."""
    record = make_record(failure_code="SUSPECTED_FRAUD", attempt_count=0)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.ESCALATE_HUMAN

    playbook = orchestrator.config["root_causes"]["fraud_hold"]
    assert playbook["allow_customer_contact"] is False
    assert playbook["max_attempts"] == 0


def test_customer_opt_out_halts_all_recovery(orchestrator):
    """DPDP Act 2023: If a customer opts out (STOP/UNSUBSCRIBE), no further
    automated messages or debit retries are permitted."""
    record = make_record(customer_opted_out=True)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)
    assert decision.action == ActionType.NO_ACTION
    assert decision.stop_condition_triggered == "customer_opted_out == true"


def test_insufficient_funds_stops_after_max_attempts(orchestrator):
    """Stopping rule: after max_attempts, escalate instead of retrying forever."""
    playbook = orchestrator.config["root_causes"]["insufficient_funds"]
    max_attempts = playbook["max_attempts"]

    record = make_record(failure_code="INSUFFICIENT_FUNDS", attempt_count=max_attempts)
    diagnosis = orchestrator.classify_root_cause(record)
    decision = orchestrator.decide_action(record, diagnosis)

    assert decision.action == ActionType.ESCALATE_HUMAN
    assert decision.stop_condition_triggered == "attempts >= max_attempts"


def test_no_root_cause_can_exceed_global_max_attempts(orchestrator):
    """Safety ceiling: no playbook may configure attempts higher than global max."""
    global_max = orchestrator.config["global_max_attempts"]
    for rc, playbook in orchestrator.config["root_causes"].items():
        assert playbook.get("max_attempts", 0) <= global_max, (
            f"{rc} exceeds global_max_attempts ceiling"
        )


def test_every_decision_has_a_human_readable_reason(orchestrator):
    """Audit-trail requirement: every decision must have clear justification."""
    for code in ["INSUFFICIENT_FUNDS", "CARD_EXPIRED", "MANDATE_REVOKED", "SUSPECTED_FRAUD", "UPI_PIN_LIMIT"]:
        record = make_record(failure_code=code)
        diagnosis = orchestrator.classify_root_cause(record)
        decision = orchestrator.decide_action(record, diagnosis)
        assert decision.reason and len(decision.reason) > 10
