"""
Bank Switch Health & Clearing Latency Telemetry Engine.

Tracks real-time issuer switch uptime, clearing speeds, and outage telemetry across major
Indian banks (HDFC, SBI, ICICI, Axis, Kotak, PNB).
"""

from __future__ import annotations

from typing import Dict, Optional
from pydantic import BaseModel


class BankTelemetryInfo(BaseModel):
    bank_name: str
    uptime_pct: float
    avg_clearing_delay_hours: float
    is_operational: bool
    preferred_fallback_rail: str
    recommended_retry_delay_hours: float


# Default telemetry table for major Indian issuers
BANK_TELEMETRY_MAP: Dict[str, BankTelemetryInfo] = {
    "HDFC Bank": BankTelemetryInfo(
        bank_name="HDFC Bank",
        uptime_pct=99.6,
        avg_clearing_delay_hours=1.5,
        is_operational=True,
        preferred_fallback_rail="upi_autopay",
        recommended_retry_delay_hours=2.0,
    ),
    "State Bank of India": BankTelemetryInfo(
        bank_name="State Bank of India",
        uptime_pct=96.8,
        avg_clearing_delay_hours=3.5,
        is_operational=True,
        preferred_fallback_rail="cards",
        recommended_retry_delay_hours=4.0,
    ),
    "ICICI Bank": BankTelemetryInfo(
        bank_name="ICICI Bank",
        uptime_pct=99.4,
        avg_clearing_delay_hours=1.5,
        is_operational=True,
        preferred_fallback_rail="upi_autopay",
        recommended_retry_delay_hours=2.0,
    ),
    "Axis Bank": BankTelemetryInfo(
        bank_name="Axis Bank",
        uptime_pct=98.9,
        avg_clearing_delay_hours=2.0,
        is_operational=True,
        preferred_fallback_rail="cards",
        recommended_retry_delay_hours=3.0,
    ),
    "Kotak Mahindra Bank": BankTelemetryInfo(
        bank_name="Kotak Mahindra Bank",
        uptime_pct=99.2,
        avg_clearing_delay_hours=1.5,
        is_operational=True,
        preferred_fallback_rail="upi_autopay",
        recommended_retry_delay_hours=2.0,
    ),
    "Punjab National Bank": BankTelemetryInfo(
        bank_name="Punjab National Bank",
        uptime_pct=95.2,
        avg_clearing_delay_hours=4.0,
        is_operational=True,
        preferred_fallback_rail="cards",
        recommended_retry_delay_hours=5.0,
    ),
}

DEFAULT_BANK_INFO = BankTelemetryInfo(
    bank_name="Standard Issuer",
    uptime_pct=98.5,
    avg_clearing_delay_hours=2.0,
    is_operational=True,
    preferred_fallback_rail="upi_autopay",
    recommended_retry_delay_hours=3.0,
)


def get_bank_telemetry(bank_name: Optional[str]) -> BankTelemetryInfo:
    """Retrieve bank switch health telemetry by bank name."""
    if not bank_name:
        return DEFAULT_BANK_INFO
    for name, info in BANK_TELEMETRY_MAP.items():
        if name.lower() in bank_name.lower() or bank_name.lower() in name.lower():
            return info
    return DEFAULT_BANK_INFO


def compute_predictive_decline_risk(
    bank_name: Optional[str],
    failure_code: str,
    attempt_count: int,
    day_of_month: int,
    payment_method: str,
) -> float:
    """
    Computes a proactive decline risk score (0.0 to 1.0) before transaction execution.
    Helps pre-emptively route high-risk debits through Smart Routing.
    """
    telemetry = get_bank_telemetry(bank_name)
    risk = (100.0 - telemetry.uptime_pct) / 100.0 * 2.0  # Uptime factor

    # Attempt factor
    risk += attempt_count * 0.15

    # Day-of-month (non-salary days have higher low balance risk)
    if day_of_month not in [1, 2, 3, 4, 5, 28, 29, 30, 31]:
        risk += 0.10

    # Payment method risk factors
    if payment_method in ["netbanking"]:
        risk += 0.12

    return max(0.05, min(0.95, risk))
