"""
Rules configuration management, validation, and database reset endpoints.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session
import yaml

from agent.rules_schema import RulesConfigSchema
from server.auth import verify_admin_key
from server.db import AuditLogRow, get_db

router = APIRouter(prefix="/api", tags=["Configuration & Maintenance"])


@router.get("/config/rules")
def get_rules_config():
    from server.app import orchestrator
    return orchestrator.config


@router.put("/config/rules", dependencies=[Depends(verify_admin_key)])
def update_rules_config(new_config: Dict[str, Any]):
    from server.app import orchestrator

    # 1. Strict Schema Validation against Pydantic model
    try:
        validated = RulesConfigSchema.model_validate(new_config)
    except ValidationError as err:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid rules configuration: {err.errors()}",
        )

    config_path = orchestrator.config_path
    backup_path = config_path.with_suffix(".yaml.bak")

    # 2. Backup current config if it exists
    if config_path.exists():
        shutil.copyfile(config_path, backup_path)

    # 3. Atomic write via temporary file
    temp_fd, temp_path = tempfile.mkstemp(dir=config_path.parent, prefix="rules_tmp_", suffix=".yaml")
    try:
        with open(temp_fd, "w") as f:
            yaml.safe_dump(validated.model_dump(), f, sort_keys=False)
        os.replace(temp_path, config_path)
    except Exception as exc:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to write rules file: {str(exc)}")

    orchestrator.config = validated.model_dump()
    return {"status": "updated", "config": orchestrator.config}


@router.post("/config/rules/reset", dependencies=[Depends(verify_admin_key)])
def reset_rules_config_to_defaults():
    from server.app import orchestrator

    backup_path = orchestrator.config_path.with_suffix(".yaml.bak")
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="No backup configuration found to restore.")

    shutil.copyfile(backup_path, orchestrator.config_path)
    with open(orchestrator.config_path) as f:
        orchestrator.config = yaml.safe_load(f)

    return {"status": "reset", "message": "Rules configuration restored to default.", "config": orchestrator.config}


@router.delete("/reset", dependencies=[Depends(verify_admin_key)])
def reset(db: Session = Depends(get_db)):
    db.query(AuditLogRow).delete()
    db.commit()
    return {"status": "reset", "message": "Audit trail wiped successfully"}
