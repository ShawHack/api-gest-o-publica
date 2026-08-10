from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.deps import CurrentUser, get_current_admin, get_current_user
from app.models import Category, Occurrence, Secretariat, User, UserRole
from app.services.audit_service import audit_fire, record_audit, record_change
from app.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    SecretariatCreate,
    SecretariatRead,
    SecretariatUpdate,
)

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/secretariats", response_model=list[SecretariatRead])
async def list_secretariats():
    rows = await Secretariat.find_all().sort("name").to_list()
    return [
        SecretariatRead(
            id=str(item.id),
            title=item.name,
            sigla=item.sigla,
            phone=item.phone,
            email=item.email,
            address=item.address,
        )
        for item in rows
    ]


@router.post("/secretariats", response_model=SecretariatRead, status_code=status.HTTP_201_CREATED)
async def create_secretariat(payload: SecretariatCreate, request: Request, admin: CurrentUser = Depends(get_current_admin)):
    name = payload.title.strip()
    sigla = payload.sigla.strip().upper()
    existing = await Secretariat.find_one(Secretariat.name == name)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Secretaria ja cadastrada")
    existing_by_sigla = await Secretariat.find_one(Secretariat.sigla == sigla)
    if existing_by_sigla is not None:
        raise HTTPException(status_code=409, detail="Sigla de secretaria ja cadastrada")

    secretariat = Secretariat(
        name=name,
        sigla=sigla,
        phone=payload.phone.strip(),
        email=payload.email.lower().strip(),
        address=payload.address.strip(),
    )
    await secretariat.insert()
    audit_fire(
        record_audit(
            request,
            action="gov.catalog.secretariat_create",
            resource_type="secretariat",
            resource_id=str(secretariat.id),
            event_type="CREATE",
            actor=admin,
        )
    )
    return SecretariatRead(
        id=str(secretariat.id),
        title=secretariat.name,
        sigla=secretariat.sigla,
        phone=secretariat.phone,
        email=secretariat.email,
        address=secretariat.address,
    )


@router.put("/secretariats/{secretariat_id}", response_model=SecretariatRead)
async def update_secretariat(secretariat_id: str, payload: SecretariatUpdate, request: Request, admin: CurrentUser = Depends(get_current_admin)):
    secretariat = await Secretariat.get(secretariat_id)
    if secretariat is None:
        raise HTTPException(status_code=404, detail="Secretaria nao encontrada")

    name = payload.title.strip()
    sigla = payload.sigla.strip().upper()
    existing = await Secretariat.find_one(Secretariat.name == name)
    if existing is not None and str(existing.id) != str(secretariat.id):
        raise HTTPException(status_code=409, detail="Ja existe outra secretaria com este titulo")
    existing_by_sigla = await Secretariat.find_one(Secretariat.sigla == sigla)
    if existing_by_sigla is not None and str(existing_by_sigla.id) != str(secretariat.id):
        raise HTTPException(status_code=409, detail="Ja existe outra secretaria com esta sigla")

    before = {"name": secretariat.name, "sigla": secretariat.sigla}
    secretariat.name = name
    secretariat.sigla = sigla
    secretariat.phone = payload.phone.strip()
    secretariat.email = payload.email.lower().strip()
    secretariat.address = payload.address.strip()
    await secretariat.save()
    audit_fire(
        record_change(
            request,
            action="gov.catalog.secretariat_update",
            resource_type="secretariat",
            resource_id=secretariat_id,
            before=before,
            after={"name": name, "sigla": sigla},
            fields=["name", "sigla"],
            actor=admin,
        )
    )

    return SecretariatRead(
        id=str(secretariat.id),
        title=secretariat.name,
        sigla=secretariat.sigla,
        phone=secretariat.phone,
        email=secretariat.email,
        address=secretariat.address,
    )


@router.delete("/secretariats/{secretariat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secretariat(secretariat_id: str, request: Request, admin: CurrentUser = Depends(get_current_admin)):
    secretariat = await Secretariat.get(secretariat_id)
    if secretariat is None:
        raise HTTPException(status_code=404, detail="Secretaria nao encontrada")

    has_categories = await Category.find_one(Category.secretariat_id == str(secretariat.id))
    if has_categories is not None:
        raise HTTPException(
            status_code=409,
            detail="Nao e possivel excluir secretaria com categorias vinculadas",
        )

    audit_fire(
        record_audit(
            request,
            action="gov.catalog.secretariat_delete",
            resource_type="secretariat",
            resource_id=secretariat_id,
            event_type="DELETE",
            actor=admin,
        )
    )
    await secretariat.delete()


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories():
    # Público (como /secretariats): cidadãos precisam listar categorias na Boca no Trombone.
    rows = await Category.find_all().sort("+secretariat_id", "+name").to_list()
    return [
        CategoryRead(
            id=str(item.id),
            title=item.name,
            description=item.description,
            secretariat_id=item.secretariat_id,
            sla_days=item.sla_days,
        )
        for item in rows
    ]


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, request: Request, current_user: CurrentUser = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SECRETARY]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin ou secretario")
    if current_user.role == UserRole.SECRETARY:
        if not current_user.secretariat_id:
            raise HTTPException(status_code=400, detail="Secretario sem secretaria vinculada")
        if payload.secretariat_id != current_user.secretariat_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Secretario pode cadastrar categoria apenas na propria secretaria",
            )

    secretariat = await Secretariat.get(payload.secretariat_id)
    if secretariat is None:
        raise HTTPException(status_code=404, detail="Secretaria nao encontrada")

    existing = await Category.find_one(
        Category.secretariat_id == payload.secretariat_id,
        Category.name == payload.title.strip(),
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Categoria ja cadastrada para esta secretaria")

    category = Category(
        name=payload.title.strip(),
        description=payload.description.strip(),
        secretariat_id=payload.secretariat_id,
        sla_days=payload.sla_days,
    )
    await category.insert()
    audit_fire(
        record_audit(
            request,
            action="gov.catalog.category_create",
            resource_type="category",
            resource_id=str(category.id),
            event_type="CREATE",
            actor=current_user,
        )
    )
    return CategoryRead(
        id=str(category.id),
        title=category.name,
        description=category.description,
        secretariat_id=category.secretariat_id,
        sla_days=category.sla_days,
    )


@router.put("/categories/{category_id}", response_model=CategoryRead)
async def update_category(category_id: str, payload: CategoryUpdate, request: Request, current_user: CurrentUser = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SECRETARY]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin ou secretario")

    category = await Category.get(category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada")

    if current_user.role == UserRole.SECRETARY:
        if not current_user.secretariat_id:
            raise HTTPException(status_code=400, detail="Secretario sem secretaria vinculada")
        if category.secretariat_id != current_user.secretariat_id or payload.secretariat_id != current_user.secretariat_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Secretario pode editar categoria apenas na propria secretaria",
            )

    secretariat = await Secretariat.get(payload.secretariat_id)
    if secretariat is None:
        raise HTTPException(status_code=404, detail="Secretaria nao encontrada")

    existing = await Category.find_one(
        Category.secretariat_id == payload.secretariat_id,
        Category.name == payload.title.strip(),
    )
    if existing is not None and str(existing.id) != str(category.id):
        raise HTTPException(status_code=409, detail="Categoria ja cadastrada para esta secretaria")

    before = {"name": category.name, "sla_days": category.sla_days, "secretariat_id": category.secretariat_id}
    category.name = payload.title.strip()
    category.description = payload.description.strip()
    category.secretariat_id = payload.secretariat_id
    category.sla_days = payload.sla_days
    await category.save()
    audit_fire(
        record_change(
            request,
            action="gov.catalog.category_update",
            resource_type="category",
            resource_id=category_id,
            before=before,
            after={"name": category.name, "sla_days": category.sla_days, "secretariat_id": category.secretariat_id},
            fields=["name", "sla_days", "secretariat_id"],
            actor=current_user,
        )
    )

    return CategoryRead(
        id=str(category.id),
        title=category.name,
        description=category.description,
        secretariat_id=category.secretariat_id,
        sla_days=category.sla_days,
    )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: str, request: Request, current_user: CurrentUser = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SECRETARY]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin ou secretario")

    category = await Category.get(category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada")

    if current_user.role == UserRole.SECRETARY:
        if not current_user.secretariat_id or category.secretariat_id != current_user.secretariat_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Secretario pode excluir categoria apenas na propria secretaria",
            )

    has_occurrences = await Occurrence.find_one(Occurrence.category_id == str(category.id))
    if has_occurrences is not None:
        raise HTTPException(
            status_code=409,
            detail="Nao e possivel excluir categoria vinculada a ocorrencias",
        )

    audit_fire(
        record_audit(
            request,
            action="gov.catalog.category_delete",
            resource_type="category",
            resource_id=category_id,
            event_type="DELETE",
            actor=current_user,
        )
    )
    await category.delete()
