"""
Authentication & Access Control Security Dependencies for mutating routes.
"""

from __future__ import annotations

import os
from typing import Optional
from fastapi import Header, HTTPException


def verify_admin_key(x_admin_key: Optional[str] = Header(None)) -> bool:
    """
    Validates X-Admin-Key header for sensitive mutating endpoints.
    If ADMIN_API_KEY environment variable is not configured, allows requests for local dev/demo.
    """
    expected_key = os.getenv("ADMIN_API_KEY", "").strip()
    if not expected_key:
        return True

    if not x_admin_key or x_admin_key != expected_key:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Invalid or missing X-Admin-Key header.",
        )
    return True
