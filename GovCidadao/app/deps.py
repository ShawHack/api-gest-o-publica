from datetime import datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.models import User, UserRole
from app.security import decode_access_token
from app.services.external_users import find_user_by_id

bearer_scheme = HTTPBearer(auto_error=True)


class CurrentUser(BaseModel):
    id: str
    name: str
    email: str
    image: str | None = None
    role: UserRole
    secretariat_id: str | None = None
    is_active: bool = True
    created_at: datetime = datetime.utcnow()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    # Prioridade: buscar usuário na coleção principal da API integrada.
    external = await find_user_by_id(user_id)
    if external is not None:
        if not external.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inativo ou inexistente")
        return CurrentUser(
            id=external.id,
            name=external.name,
            email=external.email,
            image=external.image,
            role=external.role,
            secretariat_id=external.secretariat_id,
            is_active=external.is_active,
            created_at=external.created_at,
        )

    # Fallback: usuários locais do GovCidadao.
    user = await User.get(user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inativo ou inexistente")
    return CurrentUser(
        id=str(user.id),
        name=user.name,
        email=user.email,
        image=None,
        role=user.role,
        secretariat_id=user.secretariat_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


async def get_current_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin")
    return current_user


async def get_current_secretary(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != UserRole.SECRETARY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao secretario")
    return current_user
