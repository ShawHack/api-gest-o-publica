from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.deps import CurrentUser, get_current_admin
from app.models import Secretariat, User, UserRole
from app.schemas import SecretaryCreate, UserCreate, UserRead, UserUpdate
from app.security import get_password_hash
from app.services.audit_service import audit_fire, record_audit, record_change
from app.services.external_users import (
    create_user,
    delete_user,
    find_user_by_email,
    find_user_by_id,
    list_users as list_external_users,
    update_user_fields,
)

router = APIRouter(prefix="/users", tags=["users"])


def _to_user_read(user: User) -> UserRead:
    return UserRead(
        id=str(user.id),
        name=user.name,
        email=user.email,
        image=None,
        role=user.role,
        secretariat_id=user.secretariat_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("", response_model=list[UserRead])
async def list_users(request: Request, admin: CurrentUser = Depends(get_current_admin)):
    users = await list_external_users()
    audit_fire(
        record_audit(
            request,
            action="gov.user.list",
            resource_type="user",
            event_type="VIEW",
            actor=admin,
            metadata={"count": len(users)},
        )
    )
    return [
        UserRead(
            id=u.id,
            name=u.name,
            email=u.email,
            image=u.image,
            role=u.role,
            secretariat_id=u.secretariat_id,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.post("/secretaries", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_secretary(payload: SecretaryCreate, request: Request, admin: CurrentUser = Depends(get_current_admin)):
    user = await _create_user(
        name=payload.name,
        email=payload.email,
        image=payload.image,
        password=payload.password,
        role=UserRole.SECRETARY,
        secretariat_id=payload.secretariat_id,
    )
    audit_fire(
        record_audit(
            request,
            action="gov.user.create_secretary",
            resource_type="user",
            resource_id=user.id,
            event_type="CREATE",
            actor=admin,
            metadata={"role": user.role.value, "secretariatId": user.secretariat_id},
        )
    )
    return UserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        image=user.image,
        role=user.role,
        secretariat_id=user.secretariat_id,
        is_active=user.is_active,
        created_at=user.created_at or datetime.utcnow(),
    )


async def _create_user(*, name: str, email: str, image: str | None, password: str, role: UserRole | str, secretariat_id: str | None):
    normalized_role = UserRole.ADMIN if role == "prefeito" else UserRole(role)
    normalized_email = email.lower().strip()
    existing = await find_user_by_email(normalized_email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail ja cadastrado")

    raw_role = "admin" if normalized_role == UserRole.ADMIN else ("secretario" if normalized_role == UserRole.SECRETARY else "usuario")
    raw_profile = (
        "prefeito"
        if role == "prefeito"
        else ("secretario" if normalized_role == UserRole.SECRETARY else ("comum" if normalized_role == UserRole.CITIZEN else "comum"))
    )

    normalized_secretariat_id: str | None = None
    needs_secretariat = normalized_role == UserRole.SECRETARY or role == "prefeito"
    if needs_secretariat:
        if not secretariat_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Secretaria obrigatoria para este perfil")
        secretariat = await Secretariat.get(secretariat_id)
        if secretariat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secretaria nao encontrada")
        normalized_secretariat_id = str(secretariat.id)

    return await create_user(
        name=name.strip(),
        email=normalized_email,
        image=image.strip() if image else None,
        password_hash=get_password_hash(password),
        role=normalized_role,
        secretariat_id=normalized_secretariat_id,
        raw_role=raw_role,
        raw_profile=raw_profile,
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(payload: UserCreate, request: Request, admin: CurrentUser = Depends(get_current_admin)):
    user = await _create_user(
        name=payload.name,
        email=payload.email,
        image=payload.image,
        password=payload.password,
        role=payload.role,
        secretariat_id=payload.secretariat_id,
    )
    audit_fire(
        record_audit(
            request,
            action="gov.user.create",
            resource_type="user",
            resource_id=user.id,
            event_type="CREATE",
            actor=admin,
            metadata={"role": user.role.value},
        )
    )
    return UserRead(
        id=user.id,
        name=user.name,
        email=user.email,
        image=user.image,
        role=user.role,
        secretariat_id=user.secretariat_id,
        is_active=user.is_active,
        created_at=user.created_at or datetime.utcnow(),
    )


@router.patch("/{user_id}", response_model=UserRead)
async def update_user_endpoint(user_id: str, payload: UserUpdate, request: Request, admin: CurrentUser = Depends(get_current_admin)):
    existing = await find_user_by_id(user_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado")

    updates = payload.model_dump(exclude_unset=True)

    next_email = (updates.get("email") or existing.email).lower().strip()
    if next_email != existing.email:
        duplicate = await find_user_by_email(next_email)
        if duplicate and duplicate.id != user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail ja cadastrado")

    role_input = updates.get("role")
    normalized_role = existing.role
    raw_role = existing.raw_role
    raw_profile = existing.raw_gov_profile
    if role_input is not None:
        normalized_role = UserRole.ADMIN if role_input == "prefeito" else UserRole(role_input)
        raw_role = "admin" if normalized_role == UserRole.ADMIN else ("secretario" if normalized_role == UserRole.SECRETARY else "usuario")
        raw_profile = (
            "prefeito"
            if role_input == "prefeito"
            else ("secretario" if normalized_role == UserRole.SECRETARY else "comum")
        )

    needs_secretariat = normalized_role == UserRole.SECRETARY or raw_profile == "prefeito"
    next_secretariat_id = updates.get("secretariat_id", existing.secretariat_id)
    if needs_secretariat:
        if not next_secretariat_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Secretaria obrigatoria para este perfil")
        secretariat = await Secretariat.get(next_secretariat_id)
        if secretariat is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secretaria nao encontrada")
        next_secretariat_id = str(secretariat.id)
    else:
        next_secretariat_id = None

    fields_to_update: dict[str, object] = {
        "name": (updates.get("name") or existing.name).strip(),
        "email": next_email,
        "image": (updates.get("image") if updates.get("image") is not None else (existing.image or "")).strip() or None,
        "role": raw_role,
        "govProfile": raw_profile,
        "govSecretariatId": next_secretariat_id,
    }
    if "password" in updates and updates["password"]:
        fields_to_update["password"] = get_password_hash(str(updates["password"]))
    if "is_active" in updates:
        fields_to_update["govIsActive"] = bool(updates["is_active"])

    before = {
        "name": existing.name,
        "email": existing.email,
        "role": existing.role.value,
        "secretariat_id": existing.secretariat_id,
        "is_active": existing.is_active,
    }
    if "password" in fields_to_update:
        before["password"] = "[changed]"

    updated = await update_user_fields(user_id, fields_to_update)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado")

    after = {
        "name": updated.name,
        "email": updated.email,
        "role": updated.role.value,
        "secretariat_id": updated.secretariat_id,
        "is_active": updated.is_active,
    }
    if "password" in fields_to_update:
        after["password"] = "[changed]"

    audit_fire(
        record_change(
            request,
            action="gov.user.update",
            resource_type="user",
            resource_id=user_id,
            before=before,
            after=after,
            fields=["name", "email", "role", "secretariat_id", "is_active", "password"],
            actor=admin,
            metadata={"targetUserId": user_id},
        )
    )
    return UserRead(
        id=updated.id,
        name=updated.name,
        email=updated.email,
        image=updated.image,
        role=updated.role,
        secretariat_id=updated.secretariat_id,
        is_active=updated.is_active,
        created_at=updated.created_at or datetime.utcnow(),
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_endpoint(user_id: str, request: Request, current_admin: CurrentUser = Depends(get_current_admin)):
    if str(current_admin.id) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nao e permitido excluir o proprio usuario logado")
    deleted = await delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado")
    audit_fire(
        record_audit(
            request,
            action="gov.user.delete",
            resource_type="user",
            resource_id=user_id,
            event_type="DELETE",
            actor=current_admin,
        )
    )
