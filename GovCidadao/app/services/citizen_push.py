"""Push FCM ao cidadão — integração opcional com API Node (Prefeitura App)."""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

from app.models import Occurrence, OccurrenceStatus
from app.services.citizen_status import PUSH_STATUS_BODIES, PUSH_STATUS_TITLES, format_protocol

logger = logging.getLogger(__name__)

PUSH_BRIDGE_URL = os.getenv("GARCA_PUSH_BRIDGE_URL", "").strip()
PUSH_BRIDGE_SECRET = os.getenv("GARCA_PUSH_BRIDGE_SECRET", "").strip()
PUSH_ENABLED = os.getenv("GARCA_PUSH_ENABLED", "true").lower() in ("1", "true", "yes")


async def notify_status_push(
    occurrence: Occurrence,
    new_status: OccurrenceStatus,
    reporter_user_id: Optional[str],
    *,
    reporter_email: Optional[str] = None,
) -> None:
    if not PUSH_ENABLED or not PUSH_BRIDGE_URL:
        return
    if not reporter_user_id:
        return
    protocol = format_protocol(occurrence.external_id)
    title = PUSH_STATUS_TITLES.get(new_status, "Garça Cidadão")
    body = PUSH_STATUS_BODIES.get(new_status, f"Atualização em {protocol}")
    payload = {
        "userId": reporter_user_id,
        "userEmail": reporter_email,
        "title": title,
        "body": body,
        "data": {
            "type": "boca_trombone_status",
            "occurrenceId": str(occurrence.id),
            "externalId": occurrence.external_id,
            "status": new_status.value,
            "protocol": protocol,
        },
    }
    headers = {"Content-Type": "application/json"}
    if PUSH_BRIDGE_SECRET:
        headers["X-Garca-Push-Secret"] = PUSH_BRIDGE_SECRET
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(PUSH_BRIDGE_URL, json=payload, headers=headers)
            if r.status_code >= 400:
                logger.warning("push bridge %s: %s", r.status_code, r.text[:200])
    except Exception:
        logger.exception("push bridge failed for occurrence %s", occurrence.id)
