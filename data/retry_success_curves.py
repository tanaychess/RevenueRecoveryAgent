"""
Deterministic & Realistic Retry Success Probability Modeling (Buildathon 2026).

Calibrated against Indian banking rails (UPI AutoPay, NACH, COFT, and NetBanking):
- Soft declines increase probability over attempt 2-3 as clearing cycles reset.
- Hard stops (card expired, mandate revoked, fraud) have 0% retry success.
- Insufficient funds spike significantly during salary credit cycles (1st-5th & 28th-31st).
- UPI PIN limits recover after a 24-hour bank rollover window.
"""

from __future__ import annotations

import hashlib
import random
from typing import Optional, Tuple


def get_deterministic_seed(payment_id: str, attempt_count: int, salt: str = "rzp_recovery") -> int:
    """Generate process-independent deterministic integer seed using SHA-256."""
    raw_str = f"{payment_id}:{attempt_count}:{salt}"
    digest = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def calculate_retry_success_probability(
    root_cause: str,
    attempt_count: int = 0,
    customer_tier: str = "Standard",
    is_salary_window: bool = False,
    bank_uptime_pct: float = 99.0,
    payment_method: str = "upi_autopay",
) -> float:
    """
    Computes calibrated success probability based on banking telemetry and root cause.
    """
    rc = root_cause.lower().strip()

    # Zero-probability non-retryable rails
    if rc in [
        "card_expired",
        "mandate_revoked",
        "fraud_hold",
        "coft_token_expired",
        "mandate_paused",
        "bnpl_limit_exceeded",
        "wallet_kyc_pending",
    ]:
        return 0.0

    if rc == "bank_decline_soft":
        # Attempt 0/1: clearing backlog, Attempt 2+: switch cleared
        base = 0.35 if attempt_count <= 0 else (0.75 if attempt_count == 1 else 0.85)
    elif rc == "insufficient_funds":
        base = 0.38
        if is_salary_window:
            base += 0.32  # Major boost on salary credit days
        if attempt_count > 0:
            base += 0.10
    elif rc == "upi_pin_limit":
        # 0% immediately, >85% once the 24h bank cycle resets
        base = 0.05 if attempt_count <= 0 else 0.88
    elif rc == "netbanking_down" or rc == "upi_app_unavailable":
        # Proportional to bank switch recovery telemetry
        base = max(0.1, min(0.95, bank_uptime_pct / 100.0 * 0.85))
    elif rc == "authentication_failed_3ds":
        base = 0.20
    elif rc == "technical_timeout":
        base = 0.65 if attempt_count > 0 else 0.40
    else:
        base = 0.50

    # Customer Tier Boost
    if customer_tier == "VIP":
        base += 0.15
    elif customer_tier == "Premium":
        base += 0.08

    # Payment Method Nuances
    if payment_method in ["credit_card", "debit_card"]:
        base += 0.05

    return max(0.0, min(0.98, base))


def simulate_retry_outcome(
    payment_id: str,
    root_cause: str,
    attempt_count: int = 0,
    customer_tier: str = "Standard",
    is_salary_window: bool = False,
    bank_uptime_pct: float = 99.0,
    payment_method: str = "upi_autopay",
) -> Tuple[bool, float]:
    """
    Returns (succeeded, computed_probability) using a fully deterministic seed.
    """
    prob = calculate_retry_success_probability(
        root_cause=root_cause,
        attempt_count=attempt_count,
        customer_tier=customer_tier,
        is_salary_window=is_salary_window,
        bank_uptime_pct=bank_uptime_pct,
        payment_method=payment_method,
    )

    if prob <= 0.0:
        return False, 0.0

    seed = get_deterministic_seed(payment_id, attempt_count, salt=root_cause)
    rng = random.Random(seed)
    succeeded = rng.random() < prob
    return succeeded, prob
