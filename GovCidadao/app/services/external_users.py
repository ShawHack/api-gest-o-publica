from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models import UserRole


@dataclass
class ExternalUser:
    id: str
    name: str
    email: str
    image: str | None
    role: UserRole
    secretariat_id: str | None
    is_active: bool
    created_at: datetime
    password_hash: str
    raw_role: str
    raw_gov_profile: str


def _mongo_uri_for_external_users() -> str:
    if settings.external_mongo_uri and settings.external_mongo_uri.strip():
        return settings.external_mongo_uri.strip()
    return settings.mongo_uri


def _mongo_client() -> AsyncIOMotorClient:
    return AsyncIOMotorClient(_mongo_uri_for_external_users())


def _norm_ascii_lower(value: str) -> str:
    s = (value or "").strip().lower()
    return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")


def _map_role(role: str, gov_profile: str) -> UserRole:
    r = _norm_ascii_lower(role)
    g = _norm_ascii_lower(gov_profile)
    # Memorial (User.js): secretario / Secretário → secretaria no Garça Cidadão
    if r == "secretario" or g == "secretario":
        return UserRole.SECRETARY
    # Perfis que nunca devem cair no painel administrativo do Garça Cidadão
    if r in ("usuario", "concessionario", "sama", "iluminacao_admin"):
        return UserRole.CITIZEN
    if r in ("admin", "prefeito") or g == "prefeito":
        return UserRole.ADMIN
    return UserRole.CITIZEN


def _to_external_user(doc: dict[str, Any]) -> ExternalUser:
    raw_role = str(doc.get("role") or "usuario")
    raw_gov_profile = str(doc.get("govProfile") or "comum")
    return ExternalUser(
        id=str(doc.get("_id")),
        name=str(doc.get("name") or ""),
        email=str(doc.get("email") or "").lower().strip(),
        image=(str(doc.get("image")).strip() if doc.get("image") else None),
        role=_map_role(raw_role, raw_gov_profile),
        secretariat_id=(str(doc.get("govSecretariatId")).strip() if doc.get("govSecretariatId") else None),
        is_active=bool(doc.get("govIsActive", True)),
        created_at=doc.get("createdAt") or datetime.utcnow(),
        password_hash=str(doc.get("password") or ""),
        raw_role=raw_role,
        raw_gov_profile=raw_gov_profile,
    )


async def find_user_by_email(email: str) -> ExternalUser | None:
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        doc = await col.find_one(
            {"email": email.lower().strip()},
            sort=[("createdAt", -1), ("_id", -1)],
        )
        if not doc:
            return None
        return _to_external_user(doc)
    finally:
        client.close()


async def find_user_by_id(user_id: str) -> ExternalUser | None:
    if not ObjectId.is_valid(user_id):
        return None
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        doc = await col.find_one({"_id": ObjectId(user_id)})
        if not doc:
            return None
        return _to_external_user(doc)
    finally:
        client.close()


async def list_users() -> list[ExternalUser]:
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        docs = await col.find({}).sort("createdAt", -1).to_list(length=1000)
        return [_to_external_user(d) for d in docs]
    finally:
        client.close()


async def create_secretary_user(name: str, email: str, password_hash: str, secretariat_id: str) -> ExternalUser:
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        now = datetime.utcnow()
        payload: dict[str, Any] = {
            "name": name.strip(),
            "email": email.lower().strip(),
            "phone": "14999999999",
            "password": password_hash,
            "role": "secretario",
            "govProfile": "secretario",
            "govSecretariatId": secretariat_id,
            "govIsActive": True,
            "emailVerified": True,
            "acceptedTermsAt": now,
            "acceptedTermsVersion": "1.0",
            "createdAt": now,
            "updatedAt": now,
        }
        inserted = await col.insert_one(payload)
        doc = await col.find_one({"_id": inserted.inserted_id})
        return _to_external_user(doc or payload)
    finally:
        client.close()


def _profile_for_role(role: UserRole) -> tuple[str, str]:
    if role == UserRole.ADMIN:
        return "admin", "comum"
    if role == UserRole.SECRETARY:
        return "secretario", "secretario"
    return "usuario", "comum"


async def create_user(
    *,
    name: str,
    email: str,
    image: str | None,
    password_hash: str,
    role: UserRole,
    secretariat_id: str | None = None,
    raw_role: str | None = None,
    raw_profile: str | None = None,
    cpf: str | None = None,
    phone: str | None = None,
) -> ExternalUser:
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        now = datetime.utcnow()
        resolved_raw_role, resolved_raw_profile = _profile_for_role(role)
        if raw_role:
            resolved_raw_role = raw_role
        if raw_profile:
            resolved_raw_profile = raw_profile
        payload: dict[str, Any] = {
            "name": name.strip(),
            "email": email.lower().strip(),
            "image": image.strip() if image and image.strip() else None,
            "phone": phone.strip() if phone and phone.strip() else "14999999999",
            "cpf": cpf.strip() if cpf and cpf.strip() else None,
            "password": password_hash,
            "role": resolved_raw_role,
            "govProfile": resolved_raw_profile,
            "govSecretariatId": secretariat_id if secretariat_id else None,
            "govIsActive": True,
            "emailVerified": True,
            "acceptedTermsAt": now,
            "acceptedTermsVersion": "1.0",
            "createdAt": now,
            "updatedAt": now,
        }
        inserted = await col.insert_one(payload)
        doc = await col.find_one({"_id": inserted.inserted_id})
        return _to_external_user(doc or payload)
    finally:
        client.close()


async def update_user_fields(user_id: str, fields: dict[str, Any]) -> ExternalUser | None:
    if not ObjectId.is_valid(user_id):
        return None
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        updates = {**fields, "updatedAt": datetime.utcnow()}
        result = await col.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
        if result.matched_count == 0:
            return None
        doc = await col.find_one({"_id": ObjectId(user_id)})
        if not doc:
            return None
        return _to_external_user(doc)
    finally:
        client.close()


async def anonymize_external_user(user_id: str) -> bool:
    """Anonimiza titular na coleção users da API principal (LGPD)."""
    if not ObjectId.is_valid(user_id):
        return False
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        anon_email = f"excluido+{user_id}@anon.govcidadao.local"
        result = await col.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "name": "Titular removido (LGPD)",
                    "email": anon_email,
                    "phone": "00000000000",
                    "image": None,
                    "cpf": None,
                    "cpf_cnpj": None,
                    "emailVerified": False,
                    "updatedAt": datetime.utcnow(),
                },
                "$unset": {
                    "emailVerifyToken": "",
                    "resetPasswordToken": "",
                },
            },
        )
        return result.matched_count > 0
    finally:
        client.close()


async def delete_user(user_id: str) -> bool:
    if not ObjectId.is_valid(user_id):
        return False
    client = _mongo_client()
    try:
        col = client[settings.external_user_db][settings.external_user_collection]
        result = await col.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0
    finally:
        client.close()
