"""Tests for PII sanitization, 2-way conversational AI, webhooks, RBI pre-debit rules, and ROI analytics."""

import hashlib
import hmac
import json
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from agent.models import (
    ActionType,
    PaymentMethod,
    PaymentRecord,
    RecordStatus,
    RootCause,
)
from agent.orchestrator import RecoveryOrchestrator
from integrations.razorpay_client import RazorpayClient
from server.app import app


@pytest.fixture
def orchestrator():
    return RecoveryOrchestrator(use_llm=False)


@pytest.fixture
def test_client():
    return TestClient(app)


def test_dpdp_pii_masking(orchestrator):
    record = PaymentRecord(
        payment_id="pay_9999",
        customer_id="cust_9999",
        customer_name="Tanay Sharma",
        customer_phone="9876543210",
        amount_paise=199900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined balance",
    )
    entry = orchestrator.process_record(record)
    assert entry.customer_name_masked != "Tanay Sharma"
    assert "*" in entry.customer_name_masked
    assert entry.customer_phone_masked.startswith("98")
    assert entry.customer_phone_masked.endswith("10")
    assert "******" in entry.customer_phone_masked
    assert "DPDP_PII_PROTECTED" in entry.compliance_tags


def test_conversational_reply_promise_to_pay(orchestrator):
    record = PaymentRecord(
        payment_id="pay_conv1",
        customer_id="cust_conv1",
        customer_name="Aditya Verma",
        customer_phone="9811122233",
        amount_paise=249900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined",
    )
    resp = orchestrator.handle_customer_reply(record, "I will pay tomorrow morning", language="English")
    assert resp.intent_detected == "promise_to_pay"
    assert resp.updated_status == RecordStatus.CUSTOMER_PROMISED
    assert "tomorrow" in resp.agent_reply.lower() or "retries paused" in resp.agent_reply.lower()


def test_conversational_reply_request_discount(orchestrator):
    record = PaymentRecord(
        payment_id="pay_conv2",
        customer_id="cust_conv2",
        customer_name="Pooja Nair",
        customer_phone="9822233344",
        amount_paise=299900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined",
        customer_tier="VIP",
    )
    resp = orchestrator.handle_customer_reply(record, "This subscription is too expensive, any discount?", language="English")
    assert resp.intent_detected == "request_discount"
    assert "discount" in resp.agent_reply.lower()
    assert resp.payment_link is not None


def test_conversational_reply_change_payment_method(orchestrator):
    record = PaymentRecord(
        payment_id="pay_conv3",
        customer_id="cust_conv3",
        customer_name="Karan Iyer",
        customer_phone="9833344455",
        amount_paise=99900,
        failure_code="CARD_EXPIRED",
        failure_message="Card Expired",
    )
    resp = orchestrator.handle_customer_reply(record, "Please send a UPI link to pay instead", language="Hinglish")
    assert resp.intent_detected == "change_payment_method"
    assert "https://rzp.io/i/rec_" in resp.agent_reply


def test_conversational_reply_cancellation(orchestrator):
    record = PaymentRecord(
        payment_id="pay_conv4",
        customer_id="cust_conv4",
        customer_name="Sneha Rao",
        customer_phone="9844455566",
        amount_paise=149900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined",
    )
    resp = orchestrator.handle_customer_reply(record, "Please cancel my plan and stop messaging", language="English")
    assert resp.intent_detected == "opt_out_cancellation"
    assert resp.updated_status == RecordStatus.STOPPED
    assert record.customer_opted_out is True


def test_multilingual_intent_replies(orchestrator):
    record = PaymentRecord(
        payment_id="pay_conv_multi",
        customer_id="cust_multi",
        customer_name="Suresh Kumar",
        customer_phone="9844455577",
        amount_paise=149900,
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined",
    )
    # Tamil
    resp_ta = orchestrator.handle_customer_reply(record, "repu pay panren", language="Tamil")
    assert resp_ta.intent_detected == "promise_to_pay"

    # Hindi / Hinglish
    resp_hi = orchestrator.handle_customer_reply(record, "kuch discount mil sakta hai?", language="Hindi")
    assert resp_hi.intent_detected == "request_discount"


def test_webhook_signature_verification():
    client = RazorpayClient()
    client.webhook_secret = "test_secret_123"
    payload = b'{"event":"payment.failed"}'
    valid_sig = hmac.new(b"test_secret_123", payload, hashlib.sha256).hexdigest()
    assert client.verify_webhook_signature(payload, valid_sig) is True
    assert client.verify_webhook_signature(payload, "invalid_sig") is False


def test_webhook_endpoint_rejects_unauthorized_post(test_client):
    """POST /api/webhooks/razorpay with invalid signature returns 401 Unauthorized."""
    resp = test_client.post(
        "/api/webhooks/razorpay",
        content=b'{"event":"payment.failed"}',
        headers={"x-razorpay-signature": "bad_sig_123"},
    )
    assert resp.status_code == 401
    assert "Invalid webhook signature" in resp.text


def test_webhook_endpoint_accepts_valid_signature_and_settles_payment(test_client):
    """POST /api/webhooks/razorpay with valid HMAC signature successfully auto-settles payment."""
    from server.app import orchestrator
    sec = orchestrator.razorpay.webhook_secret

    # 1. Create a simulated failure first
    test_client.post(
        "/api/simulate/custom-failure",
        json={
            "customer_name": "Deepak Patel",
            "customer_phone": "9812345678",
            "amount_inr": 1999.0,
            "payment_method": "upi_autopay",
            "bank_name": "HDFC Bank",
            "failure_code": "INSUFFICIENT_FUNDS",
            "failure_message": "Low balance",
            "customer_tier": "VIP",
        },
    )

    # Get the generated record's payment ID from audit
    audit_resp = test_client.get("/api/audit?limit=1").json()
    assert len(audit_resp["entries"]) > 0
    target_payment_id = audit_resp["entries"][0]["payment_id"]

    # 2. Fire payment_link.paid webhook event
    payload_dict = {
        "event": "payment_link.paid",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_settle_{target_payment_id[-6:]}",
                    "amount": 199900,
                    "notes": {"original_payment_id": target_payment_id},
                }
            }
        },
    }
    body_bytes = json.dumps(payload_dict).encode("utf-8")
    valid_sig = hmac.new(sec.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    resp = test_client.post(
        "/api/webhooks/razorpay",
        content=body_bytes,
        headers={"x-razorpay-signature": valid_sig, "content-type": "application/json"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "settled"

    # Verify status flipped to recovered in DB
    updated_audit = test_client.get(f"/api/audit?search={target_payment_id}").json()
    assert updated_audit["entries"][0]["status"] == "recovered"
    assert updated_audit["entries"][0]["amount_recovered_paise"] == 199900


def test_rbi_pre_debit_notification_rule(orchestrator):
    """High-value e-mandates (>= ₹5,000) must dispatch pre-debit notice before charge retry."""
    high_val_record = PaymentRecord(
        payment_id="pay_high_val_1",
        customer_id="cust_high_val",
        customer_name="Meera Kapoor",
        customer_phone="9876543210",
        amount_paise=650000,  # ₹6,500
        failure_code="INSUFFICIENT_FUNDS",
        failure_message="Declined balance",
        pre_debit_notification_sent=False,
    )
    entry = orchestrator.process_record(high_val_record)
    assert entry.action == ActionType.SEND_NUDGE.value
    assert "RBI" in entry.action_detail or "pre-debit" in entry.action_detail.lower()


def test_bnpl_and_wallet_root_causes(orchestrator):
    """Verify BNPL and Wallet root causes map and execute appropriately."""
    bnpl_record = PaymentRecord(
        payment_id="pay_bnpl_1",
        customer_id="cust_bnpl",
        customer_name="Varun Shah",
        customer_phone="9876543210",
        amount_paise=249900,
        payment_method=PaymentMethod.BNPL,
        failure_code="BNPL_LIMIT_EXCEEDED",
        failure_message="Credit partner limit exhausted",
    )
    bnpl_entry = orchestrator.process_record(bnpl_record)
    assert bnpl_entry.root_cause == RootCause.BNPL_LIMIT_EXCEEDED.value
    assert bnpl_entry.action == ActionType.SEND_PAYMENT_LINK.value

    wallet_record = PaymentRecord(
        payment_id="pay_wallet_1",
        customer_id="cust_wallet",
        customer_name="Ananya Roy",
        customer_phone="9876543210",
        amount_paise=50000,
        payment_method=PaymentMethod.WALLET,
        failure_code="WALLET_KYC_PENDING",
        failure_message="Prepaid wallet minimum KYC required",
    )
    wallet_entry = orchestrator.process_record(wallet_record)
    assert wallet_entry.root_cause == RootCause.WALLET_KYC_PENDING.value
    assert wallet_entry.action == ActionType.SEND_PAYMENT_LINK.value


def test_batch_processing_and_roi_metrics(orchestrator):
    records = [
        PaymentRecord(
            payment_id=f"pay_batch_{i}",
            customer_id=f"cust_{i}",
            customer_name=f"Customer {i}",
            customer_phone="9876543210",
            amount_paise=100000,
            failure_code="INSUFFICIENT_FUNDS",
            failure_message="Low balance",
        )
        for i in range(10)
    ]
    entries = orchestrator.process_batch(records)
    assert len(entries) == 10
    metrics = orchestrator.compute_metrics(entries)
    assert metrics.batch_size == 10
    assert metrics.total_amount_at_risk_paise == 1000000
    assert metrics.estimated_roi_multiple > 0
