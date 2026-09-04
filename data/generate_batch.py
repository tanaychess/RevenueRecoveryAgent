"""
Generates a realistic synthetic batch of failed/degraded payments across
all Indian payment methods (UPI AutoPay, Cards/COFT, NetBanking, Subscriptions).

Run: python -m data.generate_batch --count 60 --out data/synthetic_batch.json
"""

from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timedelta

FIRST_NAMES = [
    "Aarav", "Priya", "Rohan", "Sneha", "Karan", "Isha", "Vikram", "Ananya",
    "Rahul", "Neha", "Arjun", "Divya", "Sanjay", "Pooja", "Aditya", "Kavya",
    "Tanay", "Manish", "Deepika", "Shreya", "Kunal", "Meera", "Varun", "Ritu"
]
LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Singh",
    "Rao", "Mehta", "Deshmukh", "Choudhury", "Bhattacharya", "Agarwal"
]

BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"]

FAILURE_PROFILES = [
    ("INSUFFICIENT_FUNDS", 10, "Payment failed due to insufficient balance in customer account.", "upi_autopay", True),
    ("CARD_EXPIRED", 6, "The card used for this transaction has expired.", "credit_card", False),
    ("COFT_TOKEN_EXPIRED", 5, "Card-on-file token cryptogram invalid or expired per RBI mandate.", "credit_card", True),
    ("ISSUER_DECLINED", 8, "Transaction declined by issuing bank, do_not_honor with soft retry flag.", "debit_card", True),
    ("ISSUER_UNAVAILABLE", 5, "Issuer bank core switch was temporarily unavailable during auth.", "netbanking", True),
    ("MANDATE_REVOKED", 4, "The UPI Autopay mandate linked to this subscription was revoked by customer.", "upi_autopay", True),
    ("MANDATE_PAUSED", 3, "Customer requested temporary pause on recurring debit mandate.", "upi_autopay", True),
    ("UPI_PIN_LIMIT", 5, "Daily UPI transaction limit of ₹1,00,000 exceeded for this bank account.", "upi", False),
    ("UPI_APP_UNAVAILABLE", 4, "PSP app timeout on GPay/PhonePe intent invocation.", "upi", False),
    ("NETBANKING_DOWN", 4, "Issuing bank NetBanking gateway downtime scheduled maintenance.", "netbanking", False),
    ("BNPL_LIMIT_EXCEEDED", 3, "BNPL postpaid credit limit exhausted or partner authorization declined.", "bnpl", False),
    ("WALLET_KYC_PENDING", 3, "Prepaid wallet debit declined due to incomplete regulatory KYC.", "wallet", False),
    ("SUSPECTED_FRAUD", 2, "Transaction flagged by risk engine for high velocity fraud anomaly.", "credit_card", False),
    ("GATEWAY_TIMEOUT", 3, "Network request to gateway timed out before response received.", "netbanking", False),
]


def generate_batch(count: int = 60, seed: int = 7) -> list[dict]:
    rng = random.Random(seed)
    profiles = [p for p in FAILURE_PROFILES for _ in range(p[1])]
    now = datetime(2026, 8, 28, 14, 30, 0)

    records = []
    for i in range(count):
        code, _, message, method, recurring_bias = rng.choice(profiles)
        is_recurring = rng.random() < (0.80 if recurring_bias else 0.20)
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        phone = f"98{rng.randint(10000000, 99999999)}"
        tier = rng.choices(["Standard", "Premium", "VIP"], weights=[60, 30, 10])[0]
        bank = rng.choice(BANKS)
        amount_paise = rng.choice([49900, 99900, 149900, 199900, 249900, 399900, 499900, 999900])

        records.append({
            "payment_id": f"pay_{seed}{i:04d}{rng.randint(1000, 9999)}",
            "customer_id": f"cust_{1000 + i}",
            "customer_name": f"{first} {last}",
            "customer_phone": phone,
            "amount_paise": amount_paise,
            "currency": "INR",
            "failure_code": code,
            "failure_message": message,
            "payment_method": method,
            "bank_name": bank,
            "subscription_id": f"sub_{seed}{i:04d}" if is_recurring else None,
            "attempt_count": rng.choice([0, 0, 0, 1, 1, 2]),
            "created_at": (now - timedelta(hours=rng.randint(1, 120))).isoformat(),
            "is_recurring": is_recurring,
            "customer_tier": tier,
            "customer_opted_out": False,
            "promise_to_pay_date": None,
        })
    return records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=60)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--out", type=str, default="data/synthetic_batch.json")
    args = parser.parse_args()

    batch = generate_batch(args.count, args.seed)
    with open(args.out, "w") as f:
        json.dump(batch, f, indent=2)
    print(f"Generated {len(batch)} comprehensive synthetic records in {args.out}")


if __name__ == "__main__":
    main()
