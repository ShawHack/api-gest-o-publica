from datetime import datetime, timedelta
import asyncio
import json
import math
import re
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.config import settings
from app.deps import CurrentUser, get_current_admin, get_current_user
from app.models import (
    Category,
    Occurrence,
    OccurrenceSource,
    OccurrenceStatus,
    ProtectiveMeasure,
    Secretariat,
    User,
    UserRole,
    UrgencyLevel,
)
from app.schemas import (
    HeatmapPoint,
    OccurrenceCreate,
    OccurrenceHistoryRead,
    OccurrenceRead,
    OccurrenceUpdate,
    ProtectiveMeasureRead,
)
from app.services.citizen_notify import notify_after_created, notify_after_status_change, schedule_citizen_notifications
from app.services.external_users import find_user_by_id
from app.services.occurrence_history import list_history_for_occurrence
from app.services.prioritization import calculate_priority_score, count_recurrence
from app.services.protective_measures import evaluate_protective_measures
from app.services.audit_service import audit_fire, record_audit, record_change

router = APIRouter(prefix="/occurrences", tags=["occurrences"])

URGENCY_ORDER = [
    UrgencyLevel.LOW,
    UrgencyLevel.MEDIUM,
    UrgencyLevel.HIGH,
    UrgencyLevel.CRITICAL,
]


def _normalize_text(value: str | None) -> str:
    text = (value or "").strip().lower()
    if not text:
        return ""
    text = "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))
    text = re.sub(r"\s+", " ", text)
    return text


def _to_geo_bucket(latitude: float, longitude: float, step: float = 0.0015) -> tuple[int, int]:
    return (int(round(latitude / step)), int(round(longitude / step)))


def _address_key_from_occurrence(row: Occurrence) -> str:
    return _normalize_text(
        ", ".join(
            [
                item
                for item in [
                    row.cep,
                    row.address,
                    row.number,
                    row.neighborhood,
                    row.city,
                    row.state,
                ]
                if item and str(item).strip()
            ]
        )
    )


def _topic_key_from_occurrence(row: Occurrence) -> str:
    if row.category_id:
        return f"cat:{row.category_id}"
    return f"title:{_normalize_text(row.title)}"


def _recurrence_level_from_count(count: int) -> int:
    if count >= 30:
        return 4
    if count >= 20:
        return 3
    if count >= 10:
        return 2
    if count >= 5:
        return 1
    return 0


def _urgency_with_boost(urgency: UrgencyLevel, boost: int) -> UrgencyLevel:
    current_index = URGENCY_ORDER.index(urgency)
    next_index = min(len(URGENCY_ORDER) - 1, current_index + max(0, boost))
    return URGENCY_ORDER[next_index]


def _build_recurrence_stats(rows: list[Occurrence]) -> dict[str, dict[str, int]]:
    open_rows = [row for row in rows if row.status not in [OccurrenceStatus.RESOLVED, OccurrenceStatus.CANCELED]]
    address_count: dict[str, int] = {}
    topic_count: dict[str, int] = {}
    geo_count: dict[tuple[int, int], int] = {}

    for row in open_rows:
        address_key = _address_key_from_occurrence(row)
        if address_key:
            address_count[address_key] = address_count.get(address_key, 0) + 1

        topic_key = _topic_key_from_occurrence(row)
        if topic_key:
            topic_count[topic_key] = topic_count.get(topic_key, 0) + 1

        geo_bucket = _to_geo_bucket(row.latitude, row.longitude)
        geo_count[geo_bucket] = geo_count.get(geo_bucket, 0) + 1

    stats: dict[str, dict[str, int]] = {}
    for row in rows:
        if row.status in [OccurrenceStatus.RESOLVED, OccurrenceStatus.CANCELED]:
            stats[str(row.id)] = {
                "address_count": 0,
                "topic_count": 0,
                "geo_count": 0,
                "count": 0,
                "level": 0,
            }
            continue

        a_count = address_count.get(_address_key_from_occurrence(row), 0)
        t_count = topic_count.get(_topic_key_from_occurrence(row), 0)
        g_count = geo_count.get(_to_geo_bucket(row.latitude, row.longitude), 0)
        combined = max(a_count, t_count, g_count)
        stats[str(row.id)] = {
            "address_count": a_count,
            "topic_count": t_count,
            "geo_count": g_count,
            "count": combined,
            "level": _recurrence_level_from_count(combined),
        }
    return stats


def _compose_address_text(
    address: str | None,
    number: str | None,
    neighborhood: str | None,
    city: str | None,
    state: str | None,
) -> str:
    base = [address, number, neighborhood, city, state]
    text = ", ".join([str(item).strip() for item in base if item and str(item).strip()])
    if (city is None or not str(city).strip()) and "garça" not in text.lower() and "garca" not in text.lower():
        text = f"{text}, Garça, SP" if text else "Garça, SP"
    if "brasil" not in text.lower():
        text = f"{text}, Brasil"
    return text


def _address_candidates(payload: OccurrenceCreate) -> list[str]:
    candidates: list[str] = []
    # Consulta mais completa.
    candidates.append(
        _compose_address_text(
            address=payload.address,
            number=payload.number,
            neighborhood=payload.neighborhood,
            city=payload.city,
            state=payload.state,
        )
    )
    # Fallback sem bairro (evita ruído quando bairro é incomum/ausente na base).
    candidates.append(
        _compose_address_text(
            address=payload.address,
            number=payload.number,
            neighborhood=None,
            city=payload.city,
            state=payload.state,
        )
    )
    cep_digits = "".join([ch for ch in (payload.cep or "") if ch.isdigit()])
    city_use = (payload.city or "Garça").strip()
    state_use = (payload.state or "SP").strip().upper()

    if len(cep_digits) == 8:
        candidates.append(f"{cep_digits}, {city_use}, {state_use}, Brasil")
        candidates.append(f"{cep_digits}, Brasil")
        if payload.address:
            candidates.append(f"{payload.address.strip()}, {city_use}, {state_use}, Brasil")
            num = (payload.number or "").strip() or "s/n"
            candidates.append(f"{payload.address.strip()}, {num}, {city_use}, {state_use}, Brasil")
    if payload.address and payload.number:
        candidates.append(f"{payload.address.strip()}, {payload.number.strip()}, {city_use}, {state_use}, Brasil")
    if payload.neighborhood and payload.city:
        candidates.append(f"{payload.neighborhood.strip()}, {city_use}, {state_use}, Brasil")

    # Remove vazios e duplicados preservando ordem.
    seen: set[str] = set()
    unique_candidates: list[str] = []
    for item in candidates:
        value = item.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        unique_candidates.append(value)
    return unique_candidates


def _geocode_nominatim_query(params: dict[str, str]) -> tuple[float, float] | None:
    """Nominatim: aceita consulta livre (`q`) ou estruturada (`street`, `city`, `postalcode`, …)."""
    try:
        base = {
            "format": "json",
            "limit": "1",
            "addressdetails": "0",
            "countrycodes": "br",
        }
        merged = {**base, **params}
        url = f"https://nominatim.openstreetmap.org/search?{urlencode(merged)}"
        request = UrlRequest(
            url,
            headers={
                "User-Agent": "GovCidadao-Garca/1.0 (contato semit; geocodificacao ocorrencias)",
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
        )
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if isinstance(payload, list) and len(payload) > 0:
            return float(payload[0]["lat"]), float(payload[0]["lon"])
    except (HTTPError, URLError, OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None
    return None


def _geocode_nominatim(address_text: str) -> tuple[float, float] | None:
    return _geocode_nominatim_query({"q": address_text})


def _nominatim_structured_variants(payload: OccurrenceCreate) -> list[dict[str, str]]:
    """Combinações que a base OSM costuma indexar melhor que uma única string longa."""
    raw: list[dict[str, str]] = []
    addr = (payload.address or "").strip()
    num = (payload.number or "").strip()
    nb = (payload.neighborhood or "").strip()
    city = (payload.city or "Garça").strip()
    state_uf = (payload.state or "SP").strip().upper()
    cep = "".join(ch for ch in (payload.cep or "") if ch.isdigit())
    cep_hyphen = f"{cep[:5]}-{cep[5:]}" if len(cep) == 8 else ""

    street_full = ", ".join(p for p in [addr, num] if p)
    street_addr_only = addr

    if street_full and city:
        raw.append({"street": street_full, "city": city, "state": state_uf, "country": "Brazil"})
        raw.append({"street": street_full, "city": city, "state": "São Paulo", "country": "Brazil"})
    if street_addr_only and city and num:
        raw.append({"street": street_addr_only, "housenumber": num, "city": city, "state": state_uf, "country": "Brazil"})
    if street_addr_only and city:
        raw.append({"street": street_addr_only, "city": city, "state": state_uf, "country": "Brazil"})
    if street_full and nb and city:
        raw.append({"street": f"{street_full}, {nb}", "city": city, "state": state_uf, "country": "Brazil"})
    if len(cep) == 8 and city:
        raw.append({"postalcode": cep, "city": city, "state": state_uf, "country": "Brazil"})
        if cep_hyphen:
            raw.append({"postalcode": cep_hyphen, "city": city, "state": state_uf, "country": "Brazil"})
        if street_addr_only:
            raw.append({"street": street_addr_only, "postalcode": cep, "city": city, "country": "Brazil"})

    seen: set[frozenset[tuple[str, str]]] = set()
    out: list[dict[str, str]] = []
    for d in raw:
        fs = frozenset(d.items())
        if fs in seen:
            continue
        seen.add(fs)
        out.append(d)
    return out


def _geocode_photon(address_text: str) -> tuple[float, float] | None:
    """Photon (Komoot) — segundo provedor gratuito, costuma responder quando o Nominatim bloqueia o servidor."""
    try:
        params = urlencode({"q": address_text, "limit": 1, "lang": "pt"})
        url = f"https://photon.komoot.io/api/?{params}"
        request = UrlRequest(
            url,
            headers={
                "User-Agent": "GovCidadao/1.0 (semit)",
                "Accept": "application/json",
            },
        )
        with urlopen(request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
        feats = data.get("features") if isinstance(data, dict) else None
        if not feats:
            return None
        coords = feats[0].get("geometry", {}).get("coordinates")
        if not coords or len(coords) < 2:
            return None
        lon, lat = float(coords[0]), float(coords[1])
        return lat, lon
    except (HTTPError, URLError, OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def _geocode_sync(address_text: str) -> tuple[float, float] | None:
    """Por linha: Photon costuma achar endereços BR; Nominatim `q=` como segunda opção."""
    r = _geocode_photon(address_text)
    if r:
        return r
    return _geocode_nominatim(address_text)


async def _geocode_address(address_text: str) -> tuple[float, float] | None:
    try:
        return await asyncio.to_thread(_geocode_sync, address_text)
    except Exception:
        return None


def _calculate_sla_escalation(row: Occurrence, current_urgency: UrgencyLevel, current_priority_score: int) -> tuple[UrgencyLevel, int, int, int]:
    if row.status in [OccurrenceStatus.RESOLVED, OccurrenceStatus.CANCELED] or not row.due_at:
        return current_urgency, current_priority_score, 0, 0

    now = datetime.utcnow()
    if row.due_at >= now:
        return current_urgency, current_priority_score, 0, 0

    overdue_seconds = (now - row.due_at).total_seconds()
    overdue_days = max(1, math.ceil(overdue_seconds / 86400))

    escalation_level = 0
    if overdue_days >= 1:
        escalation_level = 1
    if overdue_days >= 3:
        escalation_level = 2
    if overdue_days >= 7:
        escalation_level = 3

    escalated_urgency = _urgency_with_boost(current_urgency, escalation_level)
    escalated_priority = current_priority_score + min(overdue_days * 5, 60)

    return escalated_urgency, escalated_priority, overdue_days, escalation_level


def _normalize_email(value: str | None) -> str:
    return (value or "").strip().lower()


def _occurrence_belongs_to_citizen(row: Occurrence, current_user: CurrentUser) -> bool:
    if row.reporter_user_id and row.reporter_user_id == current_user.id:
        return True
    reporter_email = _normalize_email(row.reporter_contact)
    user_email = _normalize_email(current_user.email)
    return bool(reporter_email and user_email and reporter_email == user_email)


async def _resolve_reporter_user_id(occurrence: Occurrence) -> str | None:
    if occurrence.reporter_user_id:
        return occurrence.reporter_user_id
    if occurrence.reporter_contact and "@" in occurrence.reporter_contact:
        from app.services.external_users import find_user_by_email

        external = await find_user_by_email(occurrence.reporter_contact)
        if external:
            return external.id
    return None


def _to_occurrence_read(row: Occurrence, recurrence_stats: dict[str, int] | None = None) -> OccurrenceRead:
    recurrence_stats = recurrence_stats or {}
    recurrence_count = int(recurrence_stats.get("count", 0))
    recurrence_level = int(recurrence_stats.get("level", 0))
    recurrence_address_count = int(recurrence_stats.get("address_count", 0))
    recurrence_topic_count = int(recurrence_stats.get("topic_count", 0))
    recurrence_geo_count = int(recurrence_stats.get("geo_count", 0))

    recurrence_boost = 0
    if recurrence_count >= 10:
        recurrence_boost = 1
    if recurrence_count >= 20:
        recurrence_boost = 2
    if recurrence_count >= 30:
        recurrence_boost = 3

    urgency_after_recurrence = _urgency_with_boost(row.urgency, recurrence_boost)
    priority_after_recurrence = row.priority_score + (recurrence_level * 8) + min(max(recurrence_count - 9, 0), 30)

    urgency, priority_score, overdue_days, escalation_level = _calculate_sla_escalation(
        row,
        urgency_after_recurrence,
        priority_after_recurrence,
    )
    external_id = getattr(row, "external_id", None) or str(row.id)
    updated_at = getattr(row, "updated_at", None) or row.created_at
    return OccurrenceRead(
        id=str(row.id),
        external_id=external_id,
        source=row.source,
        title=row.title,
        description=row.description,
        latitude=row.latitude,
        longitude=row.longitude,
        urgency=urgency,
        status=row.status,
        priority_score=priority_score,
        duplicate_of_id=row.duplicate_of_id,
        secretariat_id=row.secretariat_id,
        category_id=row.category_id,
        assigned_team=row.assigned_team,
        reporter_name=row.reporter_name,
        reporter_contact=row.reporter_contact,
        reporter_role=row.reporter_role,
        cep=row.cep,
        address=row.address,
        number=row.number,
        complement=row.complement,
        neighborhood=row.neighborhood,
        city=row.city,
        state=row.state,
        created_at=row.created_at,
        updated_at=updated_at,
        due_at=row.due_at,
        resolved_at=row.resolved_at,
        sla_overdue_days=overdue_days,
        sla_escalation_level=escalation_level,
        recurrence_count=recurrence_count,
        recurrence_level=recurrence_level,
        recurrence_address_count=recurrence_address_count,
        recurrence_topic_count=recurrence_topic_count,
        recurrence_geo_count=recurrence_geo_count,
    )


def _to_occurrence_read_secure(
    row: Occurrence,
    recurrence_stats: dict[str, int] | None,
    current_user: CurrentUser,
    *,
    keep_citizen_address: bool = False,
) -> OccurrenceRead:
    payload = _to_occurrence_read(row, recurrence_stats)
    can_view_sensitive = current_user.role in [UserRole.ADMIN, UserRole.SECRETARY]
    if can_view_sensitive:
        return payload
    if keep_citizen_address and _occurrence_belongs_to_citizen(row, current_user):
        payload.reporter_name = row.reporter_name
        payload.reporter_contact = row.reporter_contact
        return payload

    payload.reporter_name = None
    payload.reporter_contact = None
    payload.reporter_role = None
    payload.cep = None
    payload.address = None
    payload.number = None
    payload.complement = None
    return payload


def _to_measure_read(row: ProtectiveMeasure) -> ProtectiveMeasureRead:
    return ProtectiveMeasureRead(
        id=str(row.id),
        occurrence_id=row.occurrence_id,
        level=row.level,
        trigger=row.trigger,
        action=row.action,
        notified_roles=row.notified_roles,
        active=row.active,
        created_at=row.created_at,
    )


async def _suggest_secretariat_and_category(payload: OccurrenceCreate) -> tuple[str | None, str | None]:
    if payload.category_id:
        category = await Category.get(payload.category_id)
        if category:
            return category.secretariat_id, str(category.id)
    if payload.secretariat_id:
        return payload.secretariat_id, payload.category_id
    return None, None


async def _find_duplicate(latitude: float, longitude: float) -> Occurrence | None:
    rows = await Occurrence.find(
        Occurrence.created_at >= datetime.utcnow() - timedelta(hours=24),
        Occurrence.status != OccurrenceStatus.RESOLVED,
        Occurrence.latitude >= latitude - 0.0015,
        Occurrence.latitude <= latitude + 0.0015,
        Occurrence.longitude >= longitude - 0.0015,
        Occurrence.longitude <= longitude + 0.0015,
    ).limit(1).to_list()
    return rows[0] if rows else None


def _garca_fallback_coordinates(payload: OccurrenceCreate) -> tuple[float, float] | None:
    """Se Nominatim/Photon falharem (rede bloqueada, rate limit), último recurso para Garça/SP."""
    city_l = (payload.city or "").lower()
    if "garça" not in city_l and "garca" not in city_l:
        return None
    if not (payload.address and str(payload.address).strip()):
        return None
    return (-21.9478, -49.6549)


@router.post("", response_model=OccurrenceRead, status_code=status.HTTP_201_CREATED)
async def create_occurrence(
    payload: OccurrenceCreate,
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    secretariat_id, category_id = await _suggest_secretariat_and_category(payload)

    if payload.secretariat_id and not await Secretariat.get(payload.secretariat_id):
        raise HTTPException(status_code=404, detail="Secretaria não encontrada")

    if payload.category_id and not await Category.get(payload.category_id):
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    if not payload.address or not payload.address.strip():
        raise HTTPException(status_code=422, detail="Endereço é obrigatório para registrar a ocorrência.")

    geocoded: tuple[float, float] | None = None
    for variant in _nominatim_structured_variants(payload):
        geocoded = await asyncio.to_thread(_geocode_nominatim_query, variant)
        if geocoded:
            break
    if not geocoded:
        for candidate in _address_candidates(payload):
            geocoded = await _geocode_address(candidate)
            if geocoded:
                break
    if not geocoded:
        geocoded = _garca_fallback_coordinates(payload)
    if not geocoded:
        raise HTTPException(
            status_code=422,
            detail="Não foi possível localizar o endereço informado. Confirme rua, número, cidade/UF ou tente outro CEP.",
        )

    latitude, longitude = geocoded
    duplicate = await _find_duplicate(latitude, longitude)
    recurrence_count = await count_recurrence(
        category_id=category_id,
        latitude=latitude,
        longitude=longitude,
    )
    source_weight = 12 if payload.source == OccurrenceSource.EXTERNAL else 8
    score = calculate_priority_score(
        urgency=payload.urgency,
        recurrence_count=recurrence_count,
        source_weight=source_weight,
    )

    sla_days = settings.default_sla_days
    if category_id:
        category = await Category.get(category_id)
        if category:
            sla_days = category.sla_days

    now = datetime.utcnow()
    reporter_user_id = str(current_user.id) if current_user.role == UserRole.CITIZEN else None
    reporter_contact = payload.reporter_contact or current_user.email

    occurrence = Occurrence(
        source=payload.source,
        title=payload.title,
        description=payload.description,
        latitude=latitude,
        longitude=longitude,
        urgency=payload.urgency,
        reporter_name=payload.reporter_name or current_user.name,
        reporter_contact=reporter_contact,
        reporter_role=payload.reporter_role or str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role),
        reporter_user_id=reporter_user_id,
        cep=payload.cep,
        address=payload.address,
        number=payload.number,
        complement=payload.complement,
        neighborhood=payload.neighborhood,
        city=payload.city,
        state=(payload.state.upper() if payload.state else None),
        secretariat_id=secretariat_id,
        category_id=category_id,
        duplicate_of_id=str(duplicate.id) if duplicate else None,
        priority_score=score,
        created_at=now,
        updated_at=now,
        due_at=now + timedelta(days=sla_days),
    )
    await occurrence.insert()

    secretariat_name = ""
    category_name = ""
    if secretariat_id:
        sec = await Secretariat.get(secretariat_id)
        if sec:
            secretariat_name = sec.name
    if category_id:
        cat = await Category.get(category_id)
        if cat:
            category_name = cat.name

    reporter_uid = await _resolve_reporter_user_id(occurrence)
    schedule_citizen_notifications(
        notify_after_created(
            occurrence,
            secretariat_name=secretariat_name,
            category_name=category_name,
            reporter_user_id=reporter_uid,
        )
    )

    await evaluate_protective_measures(occurrence)
    audit_fire(
        record_audit(
            http_request,
            action="gov.occurrence.create",
            resource_type="occurrence",
            resource_id=str(occurrence.id),
            event_type="CREATE",
            actor=current_user,
            metadata={
                "categoryId": category_id,
                "secretariatId": secretariat_id,
                "urgency": str(payload.urgency),
                "city": payload.city,
            },
        )
    )
    open_rows = await Occurrence.find(Occurrence.status != OccurrenceStatus.RESOLVED, Occurrence.status != OccurrenceStatus.CANCELED).to_list()
    recurrence_map = _build_recurrence_stats(open_rows)
    return _to_occurrence_read_secure(occurrence, recurrence_map.get(str(occurrence.id)), current_user)


@router.get("", response_model=list[OccurrenceRead])
async def list_occurrences(
    http_request: Request,
    status_filter: OccurrenceStatus | None = Query(default=None, alias="status"),
    secretariat_id: str | None = None,
    category_id: str | None = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    conditions = []
    if status_filter:
        conditions.append(Occurrence.status == status_filter)
    if secretariat_id:
        conditions.append(Occurrence.secretariat_id == secretariat_id)
    if category_id:
        conditions.append(Occurrence.category_id == category_id)
    rows = await Occurrence.find(*conditions).sort("-priority_score", "-created_at").to_list()
    if current_user.role in [UserRole.ADMIN, UserRole.SECRETARY]:
        audit_fire(
            record_audit(
                http_request,
                action="gov.occurrence.list",
                resource_type="occurrence",
                event_type="VIEW",
                actor=current_user,
                metadata={"count": len(rows), "status": str(status_filter) if status_filter else None},
            )
        )
    open_rows = await Occurrence.find(Occurrence.status != OccurrenceStatus.RESOLVED, Occurrence.status != OccurrenceStatus.CANCELED).to_list()
    recurrence_map = _build_recurrence_stats(open_rows)
    return [_to_occurrence_read_secure(row, recurrence_map.get(str(row.id)), current_user) for row in rows]


@router.get("/mine", response_model=list[OccurrenceRead])
async def list_my_occurrences(
    status_filter: OccurrenceStatus | None = Query(default=None, alias="status"),
    protocol: str | None = Query(default=None, min_length=2, max_length=64),
    current_user: CurrentUser = Depends(get_current_user),
):
    user_email = _normalize_email(current_user.email)
    rows = await Occurrence.find().sort("-updated_at", "-created_at").to_list()
    mine = [
        row
        for row in rows
        if row.reporter_user_id == current_user.id
        or (_normalize_email(row.reporter_contact) == user_email and user_email)
    ]
    if status_filter:
        mine = [row for row in mine if row.status == status_filter]
    if protocol:
        needle = protocol.replace("#", "").replace("-", "").lower().strip()
        mine = [
            row
            for row in mine
            if needle in (row.external_id or "").replace("-", "").lower()
            or needle in str(row.id).lower()
        ]
    open_rows = await Occurrence.find(Occurrence.status != OccurrenceStatus.RESOLVED, Occurrence.status != OccurrenceStatus.CANCELED).to_list()
    recurrence_map = _build_recurrence_stats(open_rows)
    return [
        _to_occurrence_read_secure(
            row,
            recurrence_map.get(str(row.id)),
            current_user,
            keep_citizen_address=True,
        )
        for row in mine
    ]


@router.get("/{occurrence_id}/history", response_model=list[OccurrenceHistoryRead])
async def get_occurrence_history(
    occurrence_id: str,
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    occurrence = await Occurrence.get(occurrence_id)
    if not occurrence:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    is_staff = current_user.role in [UserRole.ADMIN, UserRole.SECRETARY]
    if not is_staff and not _occurrence_belongs_to_citizen(occurrence, current_user):
        raise HTTPException(status_code=403, detail="Acesso negado")
    history = await list_history_for_occurrence(occurrence_id)
    audit_fire(
        record_audit(
            http_request,
            action="gov.occurrence.history_view",
            resource_type="occurrence",
            resource_id=occurrence_id,
            event_type="VIEW",
            actor=current_user,
            metadata={"entries": len(history)},
        )
    )
    return history


@router.patch("/{occurrence_id}", response_model=OccurrenceRead)
async def update_occurrence(
    occurrence_id: str,
    payload: OccurrenceUpdate,
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_admin),
):
    occurrence = await Occurrence.get(occurrence_id)
    if not occurrence:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    previous_status = occurrence.status
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(occurrence, key, value)

    if occurrence.address and occurrence.address.strip():
        full_address = _compose_address_text(
            address=occurrence.address,
            number=occurrence.number,
            neighborhood=occurrence.neighborhood,
            city=occurrence.city,
            state=occurrence.state,
        )
        geocoded = await _geocode_address(full_address)
        if geocoded:
            occurrence.latitude, occurrence.longitude = geocoded

    if occurrence.status == OccurrenceStatus.RESOLVED and occurrence.resolved_at is None:
        occurrence.resolved_at = datetime.utcnow()

    occurrence.updated_at = datetime.utcnow()
    await occurrence.save()

    if "status" in data and occurrence.status != previous_status:
        reporter_uid = await _resolve_reporter_user_id(occurrence)
        schedule_citizen_notifications(
            notify_after_status_change(
                occurrence,
                occurrence.status,
                reporter_user_id=reporter_uid,
                actor_user_id=current_user.id,
                actor_name=current_user.name,
                previous_status=previous_status,
            )
        )

    if data:
        audit_fire(
            record_change(
                http_request,
                action="gov.occurrence.update",
                resource_type="occurrence",
                resource_id=occurrence_id,
                before={"status": str(previous_status)},
                after={"status": str(occurrence.status), **{k: str(v) for k, v in data.items() if k != "status"}},
                fields=["status", *list(data.keys())],
                actor=current_user,
            )
        )

    open_rows = await Occurrence.find(Occurrence.status != OccurrenceStatus.RESOLVED, Occurrence.status != OccurrenceStatus.CANCELED).to_list()
    recurrence_map = _build_recurrence_stats(open_rows)
    return _to_occurrence_read_secure(occurrence, recurrence_map.get(str(occurrence.id)), current_user)


@router.delete("/{occurrence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_occurrence(
    occurrence_id: str,
    http_request: Request,
    admin: CurrentUser = Depends(get_current_admin),
):
    occurrence = await Occurrence.get(occurrence_id)
    if not occurrence:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    audit_fire(
        record_audit(
            http_request,
            action="gov.occurrence.delete",
            resource_type="occurrence",
            resource_id=occurrence_id,
            event_type="DELETE",
            actor=admin,
        )
    )
    await occurrence.delete()


@router.get("/heatmap", response_model=list[HeatmapPoint])
async def heatmap_data(
    http_request: Request,
    only_open: bool = True,
    cell_size: float = Query(default=0.01, ge=0.001, le=0.1),
    per_occurrence: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
):
    can_view_precise_points = current_user.role in [UserRole.ADMIN, UserRole.SECRETARY]
    if not can_view_precise_points:
        per_occurrence = False
        cell_size = max(cell_size, 0.01)

    conditions = []
    if only_open:
        conditions.append(Occurrence.status != OccurrenceStatus.RESOLVED)
    rows = await Occurrence.find(*conditions).to_list()

    if per_occurrence:
        points = [
            HeatmapPoint(
                lat_cell=row.latitude,
                lon_cell=row.longitude,
                count=1,
                weighted_score=row.priority_score,
            )
            for row in rows
        ]
        points.sort(key=lambda item: item.weighted_score, reverse=True)
    else:
        buckets = {}
        for row in rows:
            lat_cell = round(row.latitude / cell_size) * cell_size
            lon_cell = round(row.longitude / cell_size) * cell_size
            key = (lat_cell, lon_cell)
            if key not in buckets:
                buckets[key] = {"count": 0, "weighted_score": 0}
            buckets[key]["count"] += 1
            buckets[key]["weighted_score"] += row.priority_score

        points = [
            HeatmapPoint(
                lat_cell=lat,
                lon_cell=lon,
                count=data["count"],
                weighted_score=data["weighted_score"],
            )
            for (lat, lon), data in buckets.items()
        ]
        points.sort(key=lambda item: (item.weighted_score, item.count), reverse=True)

    if can_view_precise_points:
        audit_fire(
            record_audit(
                http_request,
                action="gov.occurrence.heatmap_view",
                resource_type="occurrence",
                event_type="VIEW",
                actor=current_user,
                metadata={"points": len(points), "onlyOpen": only_open},
            )
        )
    return points


@router.get("/protective-measures", response_model=list[ProtectiveMeasureRead])
async def list_protective_measures(active_only: bool = True, _: CurrentUser = Depends(get_current_user)):
    conditions = [ProtectiveMeasure.active == True] if active_only else []
    rows = await ProtectiveMeasure.find(*conditions).sort("-created_at").to_list()
    return [_to_measure_read(row) for row in rows]
