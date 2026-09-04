"""
Razorpay AI Revenue Recovery Agent 2.0 (Buildathon 2026 Edition).
Top-level application entrypoint (backwards compatible with uvicorn server:app).
"""

from __future__ import annotations

import os
from server.app import app, create_app, orchestrator, runtime_metrics
from server.db import AuditLogRow, Base, SessionLocal, engine

__all__ = [
    "app",
    "create_app",
    "orchestrator",
    "runtime_metrics",
    "AuditLogRow",
    "Base",
    "SessionLocal",
    "engine",
]

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server.app:app", host="0.0.0.0", port=port, reload=True)
