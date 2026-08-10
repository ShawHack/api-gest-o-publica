from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.deps import CurrentUser, get_current_user
from app.models import User, UserRole
from app.schemas import LoginRequest, LoginResponse, RegisterRequest, UserRead
from app.security import create_access_token, get_password_hash, verify_password
from app.services.audit_service import audit_fire, mask_value, record_audit, record_security
from app.services.external_users import create_user, find_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _password_candidates(raw_password: str) -> list[str]:
    candidates = [raw_password]
    stripped = raw_password.strip()
    if stripped and stripped != raw_password:
        candidates.append(stripped)
    return candidates


def _matches_password(raw_password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    return any(verify_password(candidate, password_hash) for candidate in _password_candidates(raw_password))


def _to_user_read(user: User | CurrentUser) -> UserRead:
    return UserRead(
        id=str(user.id),
        name=user.name,
        email=user.email,
        image=getattr(user, "image", None),
        role=user.role,
        secretariat_id=user.secretariat_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


def _digits_only(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha e confirmação não conferem.")
    if not payload.accepted_terms:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aceite os termos de uso para continuar.")

    email = payload.email.lower().strip()
    if await find_user_by_email(email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado.")
    if await User.find_one(User.email == email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado.")

    cpf = _digits_only(payload.cpf)
    phone = _digits_only(payload.phone)
    if len(cpf) != 11:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CPF inválido.")
    if len(phone) < 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Telefone inválido.")

    new_user = await create_user(
        name=payload.name.strip(),
        email=email,
        image=None,
        password_hash=get_password_hash(payload.password),
        role=UserRole.CITIZEN,
        secretariat_id=None,
        cpf=cpf,
        phone=phone,
    )
    token = create_access_token(subject=new_user.id, role=new_user.role.value)
    user_read = UserRead(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        image=new_user.image,
        role=new_user.role,
        secretariat_id=new_user.secretariat_id,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )
    audit_fire(
        record_audit(
            request,
            action="gov.auth.register",
            resource_type="user",
            resource_id=new_user.id,
            event_type="CREATE",
            actor={"id": new_user.id, "name": new_user.name, "email": new_user.email, "role": new_user.role.value},
        )
    )
    return LoginResponse(access_token=token, user=user_read)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request):
    email = payload.email.lower().strip()

    # Prioridade: autenticar no mesmo users da API principal (ponte de usuário).
    external_user = await find_user_by_email(email)
    if external_user is not None:
        if not _matches_password(payload.password, external_user.password_hash):
            audit_fire(
                record_security(
                    request,
                    action="gov.auth.login_failed",
                    resource_type="user",
                    resource_id=external_user.id,
                    metadata={"reason": "invalid_credentials", "attemptedEmail": mask_value("email", email)},
                )
            )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")
        if not external_user.is_active:
            audit_fire(
                record_security(
                    request,
                    action="gov.auth.login_denied",
                    resource_type="user",
                    resource_id=external_user.id,
                    metadata={"reason": "inactive_user"},
                    actor={"id": external_user.id, "name": external_user.name, "email": external_user.email, "role": external_user.role.value},
                )
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inativo")

        token = create_access_token(subject=external_user.id, role=external_user.role.value)
        user_read = UserRead(
            id=external_user.id,
            name=external_user.name,
            email=external_user.email,
            image=external_user.image,
            role=external_user.role,
            secretariat_id=external_user.secretariat_id,
            is_active=external_user.is_active,
            created_at=external_user.created_at,
        )
        audit_fire(
            record_audit(
                request,
                action="gov.auth.login_success",
                resource_type="user",
                resource_id=external_user.id,
                event_type="LOGIN",
                actor={"id": external_user.id, "name": external_user.name, "email": external_user.email, "role": external_user.role.value},
            )
        )
        return LoginResponse(access_token=token, user=user_read)

    user = await User.find_one(User.email == email)
    if user is None or not _matches_password(payload.password, user.password_hash):
        audit_fire(
            record_security(
                request,
                action="gov.auth.login_failed",
                resource_type="user",
                metadata={"reason": "invalid_credentials", "attemptedEmail": mask_value("email", email)},
            )
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas")
    if not user.is_active:
        audit_fire(
            record_security(
                request,
                action="gov.auth.login_denied",
                resource_type="user",
                resource_id=str(user.id),
                metadata={"reason": "inactive_user"},
                actor={"id": str(user.id), "name": user.name, "email": user.email, "role": user.role.value},
            )
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inativo")

    token = create_access_token(subject=str(user.id), role=user.role.value)
    audit_fire(
        record_audit(
            request,
            action="gov.auth.login_success",
            resource_type="user",
            resource_id=str(user.id),
            event_type="LOGIN",
            actor={"id": str(user.id), "name": user.name, "email": user.email, "role": user.role.value},
        )
    )
    return LoginResponse(access_token=token, user=_to_user_read(user))


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser = Depends(get_current_user)):
    return _to_user_read(current_user)
