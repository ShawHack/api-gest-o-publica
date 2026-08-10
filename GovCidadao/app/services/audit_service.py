"""Trilha de auditoria corporativa — grava em apicemiterio.auditlogs (unificado com API Node)."""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection

from app.core.config import settings
from app.deps import CurrentUser

logger = logging.getLogger(__name__)

AUDIT_MODULE = "gov_cidadao"

SENSITIVE_KEYS = frozenset(
    {
        "password",
        "confirmpassword",
        "confirm_password",
        "token",
        "jwt",
        "authorization",
        "refreshtoken",
        "refresh_token",
    }
)
PII_MASK_KEYS = frozenset({"cpf", "cpf_cnpj", "email", "phone", "reporter_contact"})

EVENT_TYPES = frozenset(
    {
        "CREATE",
        "UPDATE",
        "DELETE",
        "VIEW",
        "DOWNLOAD",
        "UPLOAD",
        "LOGIN",
        "LOGOUT",
        "APPROVE",
        "REJECT",
        "PERMISSION_CHANGE",
        "SECURITY",
        "OTHER",
    }
)

_audit_client: AsyncIOMotorClient | None = None
_audit_collection: AsyncIOMotorCollection | None = None


def mask_value(key: str, value: Any) -> Any:
    if value is None:
        return value
    k = key.lower()
    if k in SENSITIVE_KEYS:
        return "[redacted]"
    if k in PII_MASK_KEYS:
        s = str(value)
        if k == "email" and "@" in s:
            local, domain = s.split("@", 1)
            return f"{local[:2]}***@{domain}"
        if len(s) <= 4:
            return "***"
        return f"***{s[-4:]}"
    if isinstance(value, str) and len(value) > 500:
        return f"{value[:500]}…"
    return value


def sanitize_metadata(data: dict[str, Any] | None) -> dict[str, Any]:
    if not data:
        return {}
    out: dict[str, Any] = {}
    for k, v in data.items():
        if v is None:
            continue
        if k.lower() in SENSITIVE_KEYS:
            continue
        out[k] = mask_value(k, v)
    return out


def build_changes(
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    fields: list[str] | None = None,
) -> list[dict[str, Any]]:
    before = before or {}
    after = after or {}
    keys = fields or sorted(set(before) | set(after))
    changes: list[dict[str, Any]] = []
    for field in keys:
        b = before.get(field)
        a = after.get(field)
        if b == a:
            continue
        changes.append(
            {
                "campo": field,
                "antes": mask_value(field, b),
                "depois": mask_value(field, a),
            }
        )
    return changes


def infer_event_type(action: str, explicit: str | None = None) -> str:
    if explicit and explicit in EVENT_TYPES:
        return explicit
    a = action.lower()
    if "login" in a:
        return "LOGIN"
    if "logout" in a:
        return "LOGOUT"
    if ".create" in a or a.endswith("_create") or "register" in a:
        return "CREATE"
    if ".delete" in a or "erase" in a:
        return "DELETE"
    if ".update" in a or "toggle" in a:
        return "UPDATE"
    if ".read" in a or ".list" in a or ".view" in a or "export" in a:
        return "VIEW"
    if "denied" in a or "security" in a or "invalid" in a or "failed" in a:
        return "SECURITY"
    return "OTHER"


def parse_client(request: Request | None) -> dict[str, Any]:
    if request is None:
        return {}
    h = request.headers
    return {
        k: v
        for k, v in {
            "app": (h.get("x-client-app") or h.get("x-app-id") or "").strip() or None,
            "platform": (h.get("x-client-platform") or "").strip() or None,
            "version": (h.get("x-client-version") or "").strip() or None,
            "screen": (h.get("x-screen-id") or h.get("x-client-screen") or "").strip() or None,
            "moduleHint": (h.get("x-client-module") or "").strip() or None,
            "requestId": (h.get("x-request-id") or "").strip() or None,
        }.items()
        if v is not None
    }


def _parse_user_agent(ua: str) -> dict[str, str]:
    s = ua or ""
    browser = (
        "Edge"
        if "Edg/" in s
        else "Chrome"
        if "Chrome/" in s
        else "Firefox"
        if "Firefox/" in s
        else "Safari"
        if "Safari/" in s and "Chrome" not in s
        else "Unknown"
    )
    os_name = (
        "Android"
        if "Android" in s
        else "iOS"
        if "iPhone" in s or "iPad" in s
        else "Windows"
        if "Windows" in s
        else "macOS"
        if "Mac OS X" in s or "Macintosh" in s
        else "Linux"
        if "Linux" in s
        else "Unknown"
    )
    return {"browser": browser, "os": os_name, "raw": s[:512]}


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _maybe_object_id(value: str | None) -> ObjectId | None:
    if not value or not re.fullmatch(r"[a-fA-F0-9]{24}", value):
        return None
    try:
        return ObjectId(value)
    except Exception:
        return None


def _build_actor(actor: CurrentUser | dict[str, Any] | None) -> dict[str, Any]:
    if actor is None:
        return {}
    if isinstance(actor, CurrentUser):
        data = {
            "id": actor.id,
            "name": actor.name,
            "email": actor.email,
            "role": actor.role.value if hasattr(actor.role, "value") else str(actor.role),
        }
    else:
        data = dict(actor)
    oid = _maybe_object_id(str(data.get("id") or data.get("_id") or ""))
    out: dict[str, Any] = {
        "actorName": data.get("name"),
        "actorRole": data.get("role"),
        "actorEmail": data.get("email"),
    }
    if oid is not None:
        out["actorId"] = oid
    return out


async def init_audit_db() -> None:
    global _audit_client, _audit_collection
    uri = (settings.external_mongo_uri or settings.mongo_uri or "").strip()
    if not uri:
        logger.warning("[audit] URI Mongo ausente — trilha Gov desabilitada")
        return
    _audit_client = AsyncIOMotorClient(uri)
    _audit_collection = _audit_client[settings.audit_db][settings.audit_collection]
    logger.info("[audit] GovCidadao → %s.%s", settings.audit_db, settings.audit_collection)


async def close_audit_db() -> None:
    global _audit_client, _audit_collection
    if _audit_client:
        _audit_client.close()
    _audit_client = None
    _audit_collection = None


async def _write_log(
    request: Request | None,
    *,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    status: str = "success",
    metadata: dict[str, Any] | None = None,
    event_type: str | None = None,
    actor: CurrentUser | dict[str, Any] | None = None,
    changes: list[dict[str, Any]] | None = None,
    module: str = AUDIT_MODULE,
) -> None:
    if _audit_collection is None:
        return
    try:
        client = parse_client(request)
        ua = _parse_user_agent(request.headers.get("user-agent", "") if request else "")
        ip = _client_ip(request)
        now = datetime.now(timezone.utc)
        doc: dict[str, Any] = {
            **_build_actor(actor),
            "action": action,
            "resourceType": resource_type,
            "status": status,
            "metadata": sanitize_metadata(metadata),
            "ip": ip,
            "userAgent": request.headers.get("user-agent") if request else None,
            "module": module,
            "eventType": infer_event_type(action, event_type),
            "tenant": settings.audit_tenant,
            "client": client or None,
            "geo": {"ip": ip, "userAgent": ua.get("raw"), "browser": ua.get("browser"), "os": ua.get("os")},
            "route": str(request.url.path) if request else None,
            "method": request.method if request else None,
            "requestId": client.get("requestId"),
            "createdAt": now,
            "updatedAt": now,
        }
        if resource_id:
            doc["resourceId"] = str(resource_id)
        if changes:
            doc["changes"] = changes
        await _audit_collection.insert_one(doc)
    except Exception as exc:  # noqa: BLE001
        logger.error("[audit] Falha ao registrar trilha Gov: %s", exc)


def schedule_audit(coro) -> None:
    try:
        asyncio.get_running_loop().create_task(coro)
    except RuntimeError:
        pass


async def record_audit(
    request: Request | None,
    *,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    event_type: str | None = None,
    actor: CurrentUser | dict[str, Any] | None = None,
    module: str = AUDIT_MODULE,
) -> None:
    await _write_log(
        request,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata,
        event_type=event_type,
        actor=actor,
        module=module,
    )


async def record_security(
    request: Request | None,
    *,
    action: str,
    resource_type: str = "session",
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    actor: CurrentUser | dict[str, Any] | None = None,
    status: str = "denied",
) -> None:
    await _write_log(
        request,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata,
        event_type="SECURITY",
        actor=actor,
        status=status,
    )


async def record_change(
    request: Request | None,
    *,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    fields: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    event_type: str | None = None,
    actor: CurrentUser | dict[str, Any] | None = None,
) -> None:
    changes = build_changes(before, after, fields)
    await _write_log(
        request,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata,
        event_type=event_type or "UPDATE",
        actor=actor,
        changes=changes or None,
    )


def audit_fire(coro) -> None:
    """Fire-and-forget — não bloqueia a resposta HTTP."""
    schedule_audit(coro)
