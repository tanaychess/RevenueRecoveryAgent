"""
Unit tests for deterministic retry success curves and hashing calibration.
"""

from data.retry_success_curves import (
    calculate_retry_success_probability,
    get_deterministic_seed,
    simulate_retry_outcome,
)


def test_seed_generation_is_strictly_deterministic():
    """Verify get_deterministic_seed produces exact same integer across runs."""
    seed1 = get_deterministic_seed("pay_001", attempt_count=0)
    seed2 = get_deterministic_seed("pay_001", attempt_count=0)
    assert seed1 == seed2
    assert isinstance(seed1, int)

    # Different payment ID produces different seed
    seed3 = get_deterministic_seed("pay_002", attempt_count=0)
    assert seed1 != seed3


def test_hard_stop_root_causes_have_zero_retry_probability():
    """Verify non-retryable rails return 0% retry success probability."""
    non_retryable = [
        "card_expired",
        "mandate_revoked",
        "fraud_hold",
        "coft_token_expired",
        "mandate_paused",
        "bnpl_limit_exceeded",
        "wallet_kyc_pending",
    ]
    for rc in non_retryable:
        prob = calculate_retry_success_probability(rc, attempt_count=0)
        assert prob == 0.0, f"Expected 0% probability for {rc}, got {prob}"

        succeeded, computed_prob = simulate_retry_outcome("pay_test_01", root_cause=rc)
        assert not succeeded
        assert computed_prob == 0.0


def test_salary_window_boost_increases_insufficient_funds_probability():
    """Verify salary cycle days provide calibrated probability boost for low balance."""
    normal_prob = calculate_retry_success_probability("insufficient_funds", is_salary_window=False)
    salary_prob = calculate_retry_success_probability("insufficient_funds", is_salary_window=True)

    assert salary_prob > normal_prob
    assert salary_prob - normal_prob >= 0.25


def test_soft_decline_probability_increases_over_attempts():
    """Verify bank_decline_soft probability ramps up across attempts 1 -> 2."""
    p0 = calculate_retry_success_probability("bank_decline_soft", attempt_count=0)
    p1 = calculate_retry_success_probability("bank_decline_soft", attempt_count=1)
    p2 = calculate_retry_success_probability("bank_decline_soft", attempt_count=2)

    assert p1 > p0
    assert p2 >= p1
