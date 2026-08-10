from fastapi import APIRouter, Depends, HTTPException

from app.deps import CurrentUser, get_current_user
from app.models import CitizenNotification, UserRole
from app.schemas import CitizenNotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_read(row: CitizenNotification) -> CitizenNotificationRead:
    return CitizenNotificationRead(
        id=str(row.id),
        occurrence_id=row.occurrence_id,
        title=row.title,
        body=row.body,
        read=row.read,
        created_at=row.created_at,
    )


@router.get("/mine", response_model=list[CitizenNotificationRead])
async def list_my_notifications(
    unread_only: bool = False,
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != UserRole.CITIZEN:
        raise HTTPException(status_code=403, detail="Acesso restrito ao cidadão")
    conditions = [CitizenNotification.user_id == current_user.id]
    if unread_only:
        conditions.append(CitizenNotification.read == False)  # noqa: E712
    rows = (
        await CitizenNotification.find(*conditions)
        .sort("-created_at")
        .limit(100)
        .to_list()
    )
    return [_to_read(r) for r in rows]


@router.patch("/{notification_id}/read", response_model=CitizenNotificationRead)
async def mark_notification_read(
    notification_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    row = await CitizenNotification.get(notification_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    row.read = True
    await row.save()
    return _to_read(row)


@router.post("/read-all", status_code=204)
async def mark_all_read(current_user: CurrentUser = Depends(get_current_user)):
    rows = await CitizenNotification.find(
        CitizenNotification.user_id == current_user.id,
        CitizenNotification.read == False,  # noqa: E712
    ).to_list()
    for row in rows:
        row.read = True
        await row.save()
