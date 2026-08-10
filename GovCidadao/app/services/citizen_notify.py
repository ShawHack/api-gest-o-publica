"""Orquestra histórico, e-mail, notificação in-app e push para o cidadão."""
from __future__ import annotations

import asyncio
from typing import Optional

from app.models import CitizenNotification, Occurrence, OccurrenceStatus
from app.services.external_users import find_user_by_id
from app.services.citizen_email import notify_occurrence_created, notify_status_change
from app.services.citizen_push import notify_status_push
from app.services.citizen_status import PUSH_STATUS_BODIES, PUSH_STATUS_TITLES, format_protocol
from app.services.occurrence_history import history_on_created, history_on_status_change


async def _create_in_app_notification(
    user_id: str,
    occurrence: Occurrence,
    title: str,
    body: str,
) -> None:
    note = CitizenNotification(
        user_id=user_id,
        occurrence_id=str(occurrence.id),
        title=title,
        body=body,
    )
    await note.insert()


async def notify_after_created(
    occurrence: Occurrence,
    *,
    secretariat_name: str,
    category_name: str,
    reporter_user: Optional[User] = None,
) -> None:
    await history_on_created(occurrence, secretariat_name)
    if reporter_user:
        protocol = format_protocol(occurrence.external_id)
        title = "✅ Reclamação registrada"
        body = (
            f"Sua reclamação {protocol} foi registrada e encaminhada ao setor responsável."
        )
        await _create_in_app_notification(str(reporter_user.id), occurrence, title, body)
    await notify_occurrence_created(
        occurrence,
        secretariat_name=secretariat_name,
        category_name=category_name,
    )


async def notify_after_status_change(
    occurrence: Occurrence,
    new_status: OccurrenceStatus,
    *,
    reporter_user_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    previous_status: Optional[OccurrenceStatus] = None,
) -> None:
    is_reopen = bool(
        previous_status
        and previous_status in (OccurrenceStatus.RESOLVED, OccurrenceStatus.CANCELED)
        and new_status in (OccurrenceStatus.OPEN, OccurrenceStatus.IN_PROGRESS)
    )
    await history_on_status_change(
        occurrence,
        new_status,
        actor_user_id=actor_user_id,
        actor_name=actor_name,
    )
    if reporter_user_id:
        protocol = format_protocol(occurrence.external_id)
        title = PUSH_STATUS_TITLES.get(new_status, "Atualização na sua solicitação")
        body = PUSH_STATUS_BODIES.get(
            new_status,
            f"Você possui uma atualização em sua solicitação {protocol}",
        )
        if is_reopen:
            body = f"Sua solicitação {protocol} foi reaberta para novo atendimento."
        await _create_in_app_notification(reporter_user_id, occurrence, title, body)
    await notify_status_change(occurrence, new_status, is_reopen=is_reopen)
    reporter = await find_user_by_id(reporter_user_id) if reporter_user_id else None
    await notify_status_push(occurrence, new_status, reporter_user_id, reporter_email=reporter.email if reporter else None)


def schedule_citizen_notifications(coro) -> None:
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        asyncio.run(coro)
