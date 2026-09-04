"""
Database engine, models, and session management for Razorpay Recovery Agent.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Generator, List
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from agent.models import AuditLogEntry, RecordStatus

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./recovery.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class AuditLogRow(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, index=True)
    customer_id = Column(String)
    customer_name_masked = Column(String, default="Customer")
    customer_phone_masked = Column(String, default="98******00")
    amount_paise = Column(Integer)
    payment_method = Column(String, default="subscription")
    bank_name = Column(String, default="HDFC Bank")
    customer_tier = Column(String, default="Standard")
    root_cause = Column(String)
    confidence = Column(Float)
    reasoning = Column(Text)
    evidence = Column(Text, default="[]")
    action = Column(String)
    action_detail = Column(Text)
    success = Column(Boolean)
    amount_recovered_paise = Column(Integer)
    status = Column(String)
    stop_condition_triggered = Column(String, nullable=True)
    compliance_tags = Column(Text, default="[]")
    payment_link = Column(String, nullable=True)
    upi_intent_uri = Column(String, nullable=True)
    offer_discount_pct = Column(Integer, nullable=True)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=4)
    timeline = Column(Text, default="[]")
    timestamp = Column(DateTime, default=datetime.now)


from sqlalchemy import inspect, text

Base.metadata.create_all(bind=engine)


def ensure_schema() -> None:
    """Ensures SQLite table columns match model schema across version upgrades."""
    inspector = inspect(engine)
    if "audit_log" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("audit_log")}
        expected_cols = {
            "id": "INTEGER",
            "payment_id": "VARCHAR",
            "customer_id": "VARCHAR",
            "customer_name_masked": "VARCHAR DEFAULT 'Customer'",
            "customer_phone_masked": "VARCHAR DEFAULT '98******00'",
            "amount_paise": "INTEGER",
            "payment_method": "VARCHAR DEFAULT 'subscription'",
            "bank_name": "VARCHAR DEFAULT 'HDFC Bank'",
            "customer_tier": "VARCHAR DEFAULT 'Standard'",
            "root_cause": "VARCHAR",
            "confidence": "FLOAT",
            "reasoning": "TEXT",
            "evidence": "TEXT DEFAULT '[]'",
            "action": "VARCHAR",
            "action_detail": "TEXT",
            "success": "BOOLEAN",
            "amount_recovered_paise": "INTEGER",
            "status": "VARCHAR",
            "stop_condition_triggered": "VARCHAR",
            "compliance_tags": "TEXT DEFAULT '[]'",
            "payment_link": "VARCHAR",
            "upi_intent_uri": "VARCHAR",
            "offer_discount_pct": "INTEGER",
            "attempt_count": "INTEGER DEFAULT 0",
            "max_attempts": "INTEGER DEFAULT 4",
            "timeline": "TEXT DEFAULT '[]'",
            "timestamp": "DATETIME",
        }
        with engine.connect() as conn:
            for col_name, col_type in expected_cols.items():
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE audit_log ADD COLUMN {col_name} {col_type}"))
            conn.commit()


ensure_schema()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def row_to_audit_entry(r: AuditLogRow) -> AuditLogEntry:
    """Safely converts an SQLAlchemy AuditLogRow into a validated AuditLogEntry model."""
    compliance_tags = []
    if r.compliance_tags and r.compliance_tags != "[]":
        try:
            compliance_tags = json.loads(r.compliance_tags)
        except Exception:
            compliance_tags = []

    evidence = []
    if r.evidence and r.evidence != "[]":
        try:
            evidence = json.loads(r.evidence)
        except Exception:
            evidence = []

    timeline = []
    if r.timeline and r.timeline != "[]":
        try:
            timeline = json.loads(r.timeline)
        except Exception:
            timeline = []

    return AuditLogEntry(
        id=r.id,
        payment_id=r.payment_id,
        customer_id=r.customer_id,
        customer_name_masked=r.customer_name_masked or "Customer",
        customer_phone_masked=r.customer_phone_masked or "98******00",
        amount_paise=r.amount_paise,
        payment_method=r.payment_method or "subscription",
        bank_name=r.bank_name or "HDFC Bank",
        customer_tier=r.customer_tier or "Standard",
        root_cause=r.root_cause,
        confidence=r.confidence,
        reasoning=r.reasoning or "",
        evidence=evidence,
        action=r.action,
        action_detail=r.action_detail or "",
        success=r.success,
        amount_recovered_paise=r.amount_recovered_paise or 0,
        status=RecordStatus(r.status) if r.status in [s.value for s in RecordStatus] else RecordStatus.IN_PROGRESS,
        stop_condition_triggered=r.stop_condition_triggered,
        compliance_tags=compliance_tags,
        payment_link=r.payment_link,
        upi_intent_uri=r.upi_intent_uri,
        offer_discount_pct=r.offer_discount_pct,
        attempt_count=r.attempt_count or 0,
        max_attempts=r.max_attempts or 4,
        timeline=timeline,
        timestamp=r.timestamp or datetime.now(),
    )


def persist_entries(db: Session, entries: List[AuditLogEntry]) -> List[AuditLogRow]:
    """Serializes and persists AuditLogEntry models cleanly into SQLite."""
    rows = []
    for entry in entries:
        dump = entry.model_dump(exclude={"id"})
        dump["compliance_tags"] = json.dumps(dump.get("compliance_tags", []))
        dump["evidence"] = json.dumps(dump.get("evidence", []))
        dump["timeline"] = json.dumps(dump.get("timeline", []))
        dump["status"] = entry.status.value if hasattr(entry.status, "value") else str(entry.status)
        row = AuditLogRow(**dump)
        db.add(row)
        rows.append(row)
    db.commit()
    return rows
