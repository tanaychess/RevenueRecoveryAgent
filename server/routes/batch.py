"""
Batch processing and synthetic records routes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from agent.models import PaymentRecord
from server.auth import verify_admin_key
from server.db import AuditLogRow, get_db, persist_entries

router = APIRouter(prefix="/api", tags=["Batch Processing"])
DATA_PATH = Path(__file__).parent.parent.parent / "data" / "synthetic_batch.json"


def load_batch_records() -> List[PaymentRecord]:
    if not DATA_PATH.exists():
        raise HTTPException(status_code=500, detail=f"Batch file not found at {DATA_PATH}")
    with open(DATA_PATH) as f:
        raw = json.load(f)
    return [PaymentRecord(**r) for r in raw]


@router.get("/records")
def get_records():
    records = load_batch_records()
    return {"count": len(records), "records": [r.model_dump() for r in records]}


@router.post("/process-batch", dependencies=[Depends(verify_admin_key)])
def process_batch(db: Session = Depends(get_db)):
    from server.app import orchestrator, runtime_metrics

    records = load_batch_records()
    entries = orchestrator.process_batch(records)

    # Clear previous batch rows to ensure crisp audit trail demo
    db.query(AuditLogRow).delete()
    persist_entries(db, entries)

    metrics = orchestrator.compute_metrics(entries)

    # Update runtime counters
    runtime_metrics["total_requests_processed"] += len(entries)
    runtime_metrics["total_recovered_paise_lifetime"] += metrics.total_amount_recovered_paise
    runtime_metrics["last_batch_run_at"] = metrics.records_recovered

    return {
        "processed": len(entries),
        "metrics": metrics.model_dump(),
        "entries": [e.model_dump() for e in entries],
    }
