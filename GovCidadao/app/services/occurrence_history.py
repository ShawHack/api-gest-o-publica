from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.models import Occurrence, OccurrenceHistory, OccurrenceStatus
from app.schemas import OccurrenceHistoryRead


async def append_history(
    occurrence: Occurrence,
    event_type: str,
    message: str,
    *,
    status: Optional[OccurrenceStatus] = None,
    actor_user_id: Optional[str] = None,
    actor_name: Optional[str] = None,
) -> OccurrenceHistory:
    entry = OccurrenceHistory(
        occurrence_id=str(occurrence.id),
        event_type=event_type,
        status=status,
        message=message,
        actor_user_id=actor_user_id,
        actor_name=actor_name,
    )
    await entry.insert()
    return entry


async def history_on_created(occurrence: Occurrence, secretariat_name: str) -> None:
    await append_history(
        occurrence,
        "registered",
        "Solicitação registrada.",
    )
    if secretariat_name:
        await append_history(
            occurrence,
            "forwarded",
            f"Encaminhada para {secretariat_name}.",
        )


async def history_on_status_change(
    occurrence: Occurrence,
    new_status: OccurrenceStatus,
    *,
    actor_user_id: Optional[str] = None,
    actor_name: Optional[str] = None,
) -> None:
    from app.services.citizen_status import citizen_label_for_status

    label = citizen_label_for_status(new_status)
    await append_history(
        occurrence,
        "status_changed",
        f"Status alterado para {label}.",
        status=new_status,
        actor_user_id=actor_user_id,
        actor_name=actor_name,
    )


def history_to_read(entry: OccurrenceHistory) -> OccurrenceHistoryRead:
    return OccurrenceHistoryRead(
        id=str(entry.id),
        occurrence_id=entry.occurrence_id,
        event_type=entry.event_type,
        status=entry.status,
        message=entry.message,
        created_at=entry.created_at,
    )


async def list_history_for_occurrence(occurrence_id: str) -> list[OccurrenceHistoryRead]:
    rows = (
        await OccurrenceHistory.find(OccurrenceHistory.occurrence_id == occurrence_id)
        .sort("+created_at")
        .to_list()
    )
    return [history_to_read(r) for r in rows]
