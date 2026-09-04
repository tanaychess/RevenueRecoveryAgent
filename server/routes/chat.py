"""
2-Way Conversational WhatsApp / SMS Recovery endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from agent.models import ChatReplyRequest, ChatReplyResponse, PaymentMethod, PaymentRecord
from server.db import AuditLogRow, get_db

router = APIRouter(prefix="/api/chat", tags=["Conversational AI"])


@router.post("/reply", response_model=ChatReplyResponse)
def chat_reply(req: ChatReplyRequest, db: Session = Depends(get_db)):
    from server.app import orchestrator

    row = db.query(AuditLogRow).filter(AuditLogRow.payment_id == req.payment_id).first()
    if row:
        record = PaymentRecord(
            payment_id=row.payment_id,
            customer_id=row.customer_id,
            customer_name="Rohan Mehta" if "Customer" in row.customer_name_masked else row.customer_name_masked,
            customer_phone=row.customer_phone_masked,
            amount_paise=row.amount_paise,
            currency="INR",
            failure_code=row.root_cause.upper(),
            failure_message=row.reasoning or "Payment failed.",
            payment_method=PaymentMethod(row.payment_method) if row.payment_method in [m.value for m in PaymentMethod] else PaymentMethod.UPI_AUTOPAY,
            bank_name=row.bank_name or "HDFC Bank",
            customer_tier=row.customer_tier or req.customer_tier or "VIP",
        )
    else:
        record = PaymentRecord(
            payment_id=req.payment_id,
            customer_id=f"cust_{req.payment_id[-4:]}",
            customer_name=req.customer_name or "Rohan Mehta",
            customer_phone="9876543210",
            amount_paise=int((req.amount_inr or 1499.0) * 100),
            currency="INR",
            failure_code="INSUFFICIENT_FUNDS",
            failure_message="Payment failed due to low balance.",
            customer_tier=req.customer_tier or "VIP",
        )

    return orchestrator.handle_customer_reply(
        record=record,
        customer_message=req.customer_message,
        language=req.language,
        conversation_history=req.conversation_history,
    )
