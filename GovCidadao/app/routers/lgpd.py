from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.deps import CurrentUser, get_current_user
from app.models import User
from app.routers.auth import _matches_password
from app.services.external_users import find_user_by_id
from app.services.audit_service import audit_fire, record_audit, record_security
from app.services.lgpd_subject import collect_subject_data, erase_subject_data

router = APIRouter(prefix="/lgpd", tags=["lgpd"])


class LgpdDeleteRequest(BaseModel):
    confirm: str = Field(..., description='Deve ser exatamente "EXCLUIR"')
    password: str = Field(..., min_length=1)


async def _verify_password(user: CurrentUser, password: str) -> bool:
    local = await User.get(user.id)
    if local is not None:
        return _matches_password(password, local.password_hash)
    external = await find_user_by_id(user.id)
    if external is not None:
        return _matches_password(password, external.password_hash)
    return False


@router.get("/me/export")
async def export_me(request: Request, current_user: CurrentUser = Depends(get_current_user)):
    data = await collect_subject_data(current_user)
    audit_fire(
        record_audit(
            request,
            action="gov.lgpd.export",
            resource_type="user",
            resource_id=current_user.id,
            event_type="DOWNLOAD",
            actor=current_user,
        )
    )
    return data


@router.post("/me/delete")
async def delete_me(
    body: LgpdDeleteRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    if body.confirm != "EXCLUIR":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Confirme com confirm: "EXCLUIR".',
        )

    if not await _verify_password(current_user, body.password):
        audit_fire(
            record_security(
                request,
                action="gov.lgpd.delete_denied",
                resource_type="user",
                resource_id=current_user.id,
                metadata={"reason": "invalid_password"},
                actor=current_user,
            )
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Senha incorreta.",
        )

    result = await erase_subject_data(current_user)
    audit_fire(
        record_audit(
            request,
            action="gov.lgpd.subject_erase",
            resource_type="user",
            resource_id=current_user.id,
            event_type="DELETE",
            actor=current_user,
            metadata={"occurrencesAnonymized": result.get("occurrencesAnonymized")},
        )
    )
    return result
