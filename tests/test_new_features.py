"""
Tests for Timeline Generation, Live Payment Resolution, Funnel Metrics, and Gemini Multilingual Engine.
"""

import pytest

from agent.models import (
    PaymentMethod,
    PaymentRecord,
)
from agent.orchestrator import RecoveryOrchestrator


@pytest.fixture
def orchestrator():
    return RecoveryOrchestrator(use_llm=False)


def test_timeline_generation_on_record_processing(orchestrator):
    record = PaymentRecord(
        payment_id="pay_timeline_test",
        customer_id="cust_t1",
        customer_name="Aarav Sharma",
        customer_phone="9876543210",
        amount_paise=149900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined due to low balance",
        payment_method=PaymentMethod.UPI_AUTOPAY,
        bank_name="HDFC Bank",
    )
    entry = orchestrator.process_record(record)
    assert len(entry.timeline) >= 3
    event_types = [e["event_type"] for e in entry.timeline]
    assert "detected" in event_types
    assert "diagnosed" in event_types
    assert "action_taken" in event_types


def test_funnel_metrics_computation(orchestrator):
    records = [
        PaymentRecord(
            payment_id=f"pay_fn_{i}",
            customer_id=f"cust_{i}",
            customer_name=f"Customer {i}",
            customer_phone="9876543210",
            amount_paise=100000,
            failure_code="INSUFFICIENT_FUNDS" if i % 2 == 0 else "SUSPECTED_FRAUD",
            failure_message="Declined",
        )
        for i in range(8)
    ]
    entries = orchestrator.process_batch(records)
    metrics = orchestrator.compute_metrics(entries)
    assert metrics.funnel is not None
    assert metrics.funnel.total_detected == 8
    assert metrics.funnel.total_diagnosed == 8
    assert metrics.funnel.quarantined_or_stopped >= 0


def test_multilingual_conversational_reply(orchestrator):
    record = PaymentRecord(
        payment_id="pay_multi_1",
        customer_id="cust_m1",
        customer_name="Kavya Iyer",
        customer_phone="9876543210",
        amount_paise=99900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined",
    )
    # Test Hinglish
    resp_hinglish = orchestrator.handle_customer_reply(record, "Kal pay karunga pakka", language="Hinglish")
    assert resp_hinglish.intent_detected == "promise_to_pay"
    assert "Bilkul" in resp_hinglish.agent_reply or "reminder" in resp_hinglish.agent_reply.lower()

    # Test English
    resp_english = orchestrator.handle_customer_reply(record, "Can I get some discount?", language="English")
    assert resp_english.intent_detected == "request_discount"
    assert "discount" in resp_english.agent_reply.lower()
