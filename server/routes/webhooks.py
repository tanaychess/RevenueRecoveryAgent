"""
HMAC-SHA256 verified Razorpay Webhook Handler with closed-loop settlement.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from agent.models import PaymentMethod, PaymentRecord, RecordStatus, TimelineEvent
from server.db import AuditLogRow, get_db, persist_entries

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    from server.app import orchestrator

    body_bytes = await request.body()

    # Verify HMAC-SHA256 signature
    if not orchestrator.razorpay.verify_webhook_signature(body_bytes, x_razorpay_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event", "unknown")
    payment_payload = payload.get("payload", {})
    payment_entity = payment_payload.get("payment", {}).get("entity", {})
    payment_link_entity = payment_payload.get("payment_link", {}).get("entity", {})

    # Extract payment identifiers from payment or link entity notes
    payment_id = (
        payment_entity.get("id")
        or payment_entity.get("notes", {}).get("original_payment_id")
        or payment_entity.get("notes", {}).get("payment_id")
        or payment_link_entity.get("notes", {}).get("original_payment_id")
        or f"pay_wh_{int(datetime.now().timestamp())}"
    )

    # 1. Closed-Loop Webhook Settlement: Handle payment capture / link payment completion
    if event in ["payment_link.paid", "payment.captured", "order.paid"]:
        amount_paise = payment_entity.get("amount") or payment_link_entity.get("amount")
        # Find matching row in audit log
        row = db.query(AuditLogRow).filter(
            (AuditLogRow.payment_id == payment_id)
            | (AuditLogRow.payment_id == payment_entity.get("notes", {}).get("original_payment_id"))
            | (AuditLogRow.payment_id == payment_link_entity.get("notes", {}).get("original_payment_id"))
        ).first()

        if row:
            settled_amount = amount_paise or row.amount_paise
            row.status = RecordStatus.RECOVERED.value
            row.success = True
            row.amount_recovered_paise = settled_amount
            row.action_detail = f"Settlement confirmed via Razorpay Webhook ({event}). Funds credited."

            timeline_list = json.loads(row.timeline) if row.timeline else []
            timeline_list.append(
                TimelineEvent(
                    event_type="payment_settled",
                    title="Settlement Confirmed (Webhook)",
                    description=f"Received ₹{settled_amount / 100:,.0f} via Razorpay event '{event}'. Verified signature.",
                    actor="razorpay_api",
                    badge_variant="emerald",
                ).model_dump()
            )
            row.timeline = json.dumps(timeline_list)
            db.commit()
            return {
                "status": "settled",
                "event": event,
                "payment_id": row.payment_id,
                "amount_recovered_inr": settled_amount / 100,
            }

        return {"status": "received_unmatched", "event": event, "payment_id": payment_id}

    # 2. Autonomous Failure Processing: Handle payment.failed or subscription.halted
    if event in ["payment.failed", "subscription.halted"]:
        record = PaymentRecord(
            payment_id=payment_id,
            customer_id=payment_entity.get("customer_id", "cust_webhook"),
            customer_name=payment_entity.get("notes", {}).get("name", "Webhook Customer"),
            customer_phone=payment_entity.get("contact", "9876543210"),
            amount_paise=payment_entity.get("amount", 99900),
            currency=payment_entity.get("currency", "INR"),
            failure_code=payment_entity.get("error_code", "INSUFFICIENT_FUNDS"),
            failure_message=payment_entity.get("error_description", "Webhook reported payment failure"),
            payment_method=PaymentMethod.UPI_AUTOPAY,
        )
        entry = orchestrator.process_record(record)
        persist_entries(db, [entry])

        return {"status": "processed", "event": event, "action_taken": entry.action}

    return {"status": "received", "event": event}
