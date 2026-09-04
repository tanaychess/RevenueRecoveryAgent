"""
FastAPI application entrypoint for Razorpay AI Revenue Recovery Agent 2.0.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.orchestrator import RecoveryOrchestrator
from server.routes import audit, batch, chat, config, simulate, webhooks

load_dotenv()

# Structured logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("recovery_agent.server")

# In-memory runtime telemetry counters
runtime_metrics: Dict[str, Any] = {
    "total_requests_processed": 0,
    "total_recovered_paise_lifetime": 0,
    "last_batch_run_at": None,
}

orchestrator = RecoveryOrchestrator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Razorpay AI Revenue Recovery Agent...")
    if orchestrator.use_llm:
        logger.info(
            "Gemini model '%s' self-check status: %s",
            orchestrator.gemini.model_name,
            orchestrator.gemini.last_check_status,
        )
    else:
        logger.info("Running in zero-key offline deterministic compliance mode.")
    yield
    logger.info("Shutting down recovery agent...")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Razorpay AI Revenue Recovery Agent 2.0",
        description="Autonomous Agentic Engine for Failed Payment Recovery (Razorpay Buildathon 2026)",
        version="2.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health & Telemetry
    @app.get("/health", tags=["Health & Diagnostics"])
    def health():
        return {
            "status": "healthy",
            "llm_provider": "google-gemini" if orchestrator.use_llm else "rule-based-deterministic",
            "gemini_model": orchestrator.gemini_model if orchestrator.use_llm else None,
            "llm_enabled": orchestrator.use_llm,
            "llm_last_check": orchestrator.gemini.last_check_status,
            "razorpay_live_mode": orchestrator.razorpay.live,
            "compliance_engine": "active (RBI, NPCI, TRAI, DPDP)",
            "runtime_telemetry": runtime_metrics,
        }

    # Register modular route routers
    app.include_router(batch.router)
    app.include_router(audit.router)
    app.include_router(chat.router)
    app.include_router(simulate.router)
    app.include_router(webhooks.router)
    app.include_router(config.router)

    return app


app = create_app()
