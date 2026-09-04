"""
Simulation arena endpoints for custom failure injection, scenario stress tests, and payment completion.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from agent.models import (
    CustomFailureRequest,
    PaymentMethod,
    PaymentRecord,
    RecordStatus,
    ResolvePaymentRequest,
    ScenarioRequest,
    TimelineEvent,
)
from server.auth import verify_admin_key
from server.db import AuditLogRow, get_db, persist_entries

router = APIRouter(prefix="/api/simulate", tags=["Simulation Arena"])


@router.post("/resolve-payment", dependencies=[Depends(verify_admin_key)])
def resolve_payment(req: ResolvePaymentRequest, db: Session = Depends(get_db)):
    """Simulates customer completing payment through Razorpay Link / UPI Intent in real-time."""
    row = db.query(AuditLogRow).filter(AuditLogRow.payment_id == req.payment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Payment record not found")

    recovered_paise = req.recovered_amount_paise or row.amount_paise
    row.status = RecordStatus.RECOVERED.value
    row.success = True
    row.amount_recovered_paise = recovered_paise
    row.action_detail = f"Customer completed payment via {req.channel}. Settled into Razorpay Merchant Balance."

    timeline_list = json.loads(row.timeline) if row.timeline else []
    timeline_list.append(
        TimelineEvent(
            event_type="payment_settled",
            title=f"Customer Paid via {req.channel.replace('_', ' ').title()}",
            description=f"Received ₹{recovered_paise / 100:,.0f}. Razorpay webhook confirmed payment capture.",
            actor="customer",
            badge_variant="emerald",
        ).model_dump()
    )
    row.timeline = json.dumps(timeline_list)
    db.commit()

    return {
        "status": "success",
        "message": f"Payment {req.payment_id} successfully converted to RECOVERED.",
        "payment_id": req.payment_id,
        "amount_recovered_inr": recovered_paise / 100,
    }


@router.post("/custom-failure", dependencies=[Depends(verify_admin_key)])
def simulate_custom_failure(req: CustomFailureRequest, db: Session = Depends(get_db)):
    from server.app import orchestrator

    record = PaymentRecord(
        payment_id=f"pay_sim_{int(datetime.now().timestamp())}",
        customer_id=f"cust_{int(datetime.now().timestamp()) % 10000}",
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        amount_paise=int(req.amount_inr * 100),
        currency="INR",
        failure_code=req.failure_code,
        failure_message=req.failure_message,
        payment_method=req.payment_method,
        bank_name=req.bank_name,
        customer_tier=req.customer_tier,
        attempt_count=0,
    )

    entry = orchestrator.process_record(record)
    persist_entries(db, [entry])

    return {
        "record": record.model_dump(),
        "audit_entry": entry.model_dump(),
    }


@router.post("/scenario", dependencies=[Depends(verify_admin_key)])
def simulate_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    from server.app import orchestrator

    records: List[PaymentRecord] = []
    now = datetime.now()

    if req.scenario_type == "mass_bank_outage":
        for i in range(req.count):
            records.append(
                PaymentRecord(
                    payment_id=f"pay_outage_{i:03d}_{int(now.timestamp()) % 1000}",
                    customer_id=f"cust_{2000 + i}",
                    customer_name=f"Subscriber {i+1}",
                    customer_phone=f"98{70000000 + i}",
                    amount_paise=199900,
                    failure_code="NETBANKING_DOWN" if i % 2 == 0 else "ISSUER_UNAVAILABLE",
                    failure_message=f"{req.bank_name} core gateway switch degradation detected.",
                    payment_method=PaymentMethod.NETBANKING,
                    bank_name=req.bank_name,
                )
            )
    elif req.scenario_type == "salary_day_surge":
        for i in range(req.count):
            records.append(
                PaymentRecord(
                    payment_id=f"pay_sal_{i:03d}_{int(now.timestamp()) % 1000}",
                    customer_id=f"cust_{3000 + i}",
                    customer_name=f"Employee {i+1}",
                    customer_phone=f"98{80000000 + i}",
                    amount_paise=99900,
                    failure_code="INSUFFICIENT_FUNDS",
                    failure_message="Low account balance at 1st of month presentation.",
                    payment_method=PaymentMethod.UPI_AUTOPAY,
                    bank_name="State Bank of India",
                    customer_tier="Premium",
                )
            )
    else:  # card_token_expiry
        for i in range(req.count):
            records.append(
                PaymentRecord(
                    payment_id=f"pay_coft_{i:03d}_{int(now.timestamp()) % 1000}",
                    customer_id=f"cust_{4000 + i}",
                    customer_name=f"CardHolder {i+1}",
                    customer_phone=f"98{90000000 + i}",
                    amount_paise=249900,
                    failure_code="COFT_TOKEN_EXPIRED",
                    failure_message="RBI Tokenization cryptogram expired.",
                    payment_method=PaymentMethod.CREDIT_CARD,
                    bank_name="HDFC Bank",
                )
            )

    entries = orchestrator.process_batch(records)
    persist_entries(db, entries)
    metrics = orchestrator.compute_metrics(entries)

    return {
        "scenario": req.scenario_type,
        "processed_count": len(entries),
        "metrics": metrics.model_dump(),
    }
