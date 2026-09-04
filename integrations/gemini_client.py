"""
Google Gemini 2.5 Flash Client Integration for Razorpay Recovery Agent.

Handles:
- Startup self-check & provider health probe
- Structured JSON prompt engineering with chain-of-thought evidence extraction
- Multi-lingual conversational recovery over WhatsApp / SMS
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("recovery_agent.gemini")


class GeminiRecoveryClient:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        self.model_name = (model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")).strip()
        self.enabled = bool(self.api_key and not self.api_key.startswith("your_") and len(self.api_key) > 8)

        self._client = None
        self.last_check_status: str = "uninitialized"
        self.last_check_timestamp: Optional[datetime] = None

        if self.enabled:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                self.check_connectivity()
            except Exception as exc:
                self.last_check_status = f"failed: {str(exc)}"
                self.enabled = False
                logger.warning("Gemini Client initialization failed: %s", exc)
        else:
            self.last_check_status = "disabled (no API key configured, using deterministic fallback)"

    def check_connectivity(self) -> Tuple[bool, str]:
        """Runs a minimal self-check against the configured Gemini model."""
        if not self._client or not self.enabled:
            return False, self.last_check_status

        try:
            resp = self._client.models.generate_content(
                model=self.model_name,
                contents="Ping",
            )
            self.last_check_status = "ok"
            self.last_check_timestamp = datetime.now()
            logger.info("Gemini self-check passed against model %s", self.model_name)
            return True, "ok"
        except Exception as exc:
            self.last_check_status = f"failed: {str(exc)[:120]}"
            self.last_check_timestamp = datetime.now()
            logger.error("Gemini self-check failed for model %s: %s", self.model_name, exc)
            return False, self.last_check_status

    def classify_root_cause(
        self,
        payment_id: str,
        amount_inr: float,
        payment_method: str,
        bank_name: Optional[str],
        failure_code: str,
        failure_message: str,
        attempt_count: int,
        baseline_cause: str,
        baseline_confidence: float,
    ) -> Optional[Dict[str, Any]]:
        """Invokes Gemini 2.5 Flash to diagnose root cause and extract analytical evidence."""
        if not self._client or not self.enabled:
            return None

        prompt = f"""You are a specialized AI payment recovery diagnostic agent for Razorpay Buildathon 2026.
Analyze this payment failure event and classify the true root cause with verifiable evidence signals.

Payment ID: {payment_id}
Amount: ₹{amount_inr:,.2f}
Payment Method: {payment_method}
Bank: {bank_name or 'Unknown'}
Failure Code: {failure_code}
Failure Message: "{failure_message}"
Prior Attempts: {attempt_count}
Baseline Rule Engine Diagnosis: '{baseline_cause}' (conf: {baseline_confidence})

Valid Root Causes:
- insufficient_funds
- card_expired
- coft_token_expired
- bank_decline_soft
- mandate_revoked
- mandate_paused
- upi_pin_limit
- upi_app_unavailable
- netbanking_down
- authentication_failed_3ds
- bnpl_limit_exceeded
- wallet_kyc_pending
- fraud_hold
- technical_timeout
- unknown

Respond strictly with valid JSON:
{{
  "root_cause": "<one_of_valid_root_causes>",
  "confidence": <float between 0.50 and 1.00>,
  "reasoning": "<concise 1-sentence analytical justification>",
  "evidence": ["<evidence signal 1>", "<evidence signal 2>", "<evidence signal 3>"]
}}"""

        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )
            text = (response.text or "").strip()
            text = re.sub(r"^```json\s*", "", text)
            text = re.sub(r"\s*```$", "", text).strip()
            return json.loads(text)
        except Exception as exc:
            logger.warning("Gemini classification call failed: %s", exc)
            return None

    def generate_chat_reply(
        self,
        customer_name: str,
        amount_inr: float,
        payment_id: str,
        payment_method: str,
        customer_tier: str,
        target_language: str,
        customer_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Invokes Gemini 2.5 Flash for contextual, empathetic multi-lingual conversational recovery."""
        if not self._client or not self.enabled:
            return None

        history_str = ""
        if conversation_history:
            history_str = "\n".join(
                [f"{m.get('sender', 'user')}: {m.get('message', '')}" for m in conversation_history[-4:]]
            )

        prompt = f"""You are Razorpay's AI Revenue Recovery Assistant communicating with an Indian customer over WhatsApp/SMS.
Context:
Customer Name: {customer_name}
Invoice Amount: ₹{amount_inr:,.0f}
Payment ID: {payment_id}
Payment Method: {payment_method}
Customer Tier: {customer_tier}
Target Language: {target_language}

Prior Conversation:
{history_str}

Customer said: "{customer_message}"

Guidelines:
1. Empathy first: Never sound aggressive, threatening, or like a debt collector.
2. If customer asks for discount, offer 5-10% discount if VIP/Premium tier.
3. If customer asks to pay tomorrow/later, agree and pause retries for 24h.
4. If customer asks to stop or cancel, confirm DPDP opt-out gracefully.
5. If customer asks for UPI/Card, provide link: https://rzp.io/i/rec_{payment_id[-6:]}
6. Keep the response concise (2-3 sentences), warm, and formatted in natural {target_language}.
7. Assess customer sentiment/frustration level (low, medium, or high).

Respond strictly in JSON format:
{{
  "intent_detected": "<promise_to_pay | request_discount | change_payment_method | opt_out_cancellation | technical_dispute | general_inquiry>",
  "agent_reply": "<your empathetic response in {target_language}>",
  "action_taken": "<snooze_retries_24h | apply_churn_prevention_discount | generate_multi_method_link | halt_all_contact | provide_assistance>",
  "quick_replies": ["<CTA 1>", "<CTA 2>", "<CTA 3>"],
  "applied_discount_pct": <0 or 5 or 10>,
  "frustration_level": "<low | medium | high>",
  "reasoning_summary": "<1-sentence note on customer sentiment and action>"
}}"""

        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )
            text = (response.text or "").strip()
            text = re.sub(r"^```json\s*", "", text)
            text = re.sub(r"\s*```$", "", text).strip()
            return json.loads(text)
        except Exception as exc:
            logger.warning("Gemini chat reply failed: %s", exc)
            return None
