from __future__ import annotations

import secrets
from datetime import datetime
from typing import Any

from app.deps import CurrentUser
from app.models import CitizenNotification, Occurrence, OccurrenceHistory, User
from app.security import get_password_hash
from app.services.external_users import anonymize_external_user, find_user_by_id


def _safe_profile(user: CurrentUser) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "secretariat_id": user.secretariat_id,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _citizen_occurrence_filter(user: CurrentUser) -> dict[str, Any]:
    email = (user.email or "").strip().lower()
    clauses: list[dict[str, Any]] = [{"reporter_user_id": user.id}]
    if email:
        clauses.append({"reporter_contact": {"$regex": f"^{email}$", "$options": "i"}})
    return {"$or": clauses}


async def collect_subject_data(user: CurrentUser) -> dict[str, Any]:
    filt = _citizen_occurrence_filter(user)
    occurrences = await Occurrence.find(filt).to_list()
    occ_ids = [str(o.id) for o in occurrences]

    notifications = await CitizenNotification.find(
        CitizenNotification.user_id == user.id
    ).to_list()

    history: list[OccurrenceHistory] = []
    if occ_ids:
        history = await OccurrenceHistory.find(
            {"occurrence_id": {"$in": occ_ids}}
        ).sort("-created_at").limit(500).to_list()

    actor_history = await OccurrenceHistory.find(
        OccurrenceHistory.actor_user_id == user.id
    ).sort("-created_at").limit(200).to_list()

    return {
        "exportedAt": datetime.utcnow().isoformat() + "Z",
        "userId": user.id,
        "profile": _safe_profile(user),
        "occurrences": [o.model_dump(mode="json") for o in occurrences],
        "notifications": [n.model_dump(mode="json") for n in notifications],
        "occurrenceHistory": [h.model_dump(mode="json") for h in history],
        "historyAsActor": [h.model_dump(mode="json") for h in actor_history],
        "note": (
            "Dados da conta Memorial/API principal: use também GET /api/lgpd/me/export "
            "no host api.garca.sp.gov.br se você usa o mesmo login no memorial."
        ),
    }


async def erase_subject_data(user: CurrentUser) -> dict[str, Any]:
    filt = _citizen_occurrence_filter(user)
    occurrences = await Occurrence.find(filt).to_list()
    occ_ids = [str(o.id) for o in occurrences]

    for occ in occurrences:
        occ.reporter_name = "Titular removido (LGPD)"
        occ.reporter_contact = None
        occ.reporter_user_id = None
        occ.reporter_role = None
        occ.updated_at = datetime.utcnow()
        await occ.save()

    await CitizenNotification.find(CitizenNotification.user_id == user.id).delete()

    if occ_ids:
        await OccurrenceHistory.get_motor_collection().update_many(
            {"occurrence_id": {"$in": occ_ids}},
            {"$set": {"actor_name": None, "message": "[redigido LGPD]"}},
        )

    await OccurrenceHistory.get_motor_collection().update_many(
        {"actor_user_id": user.id},
        {"$set": {"actor_user_id": None, "actor_name": None}},
    )

    local = await User.get(user.id)
    if local is not None:
        local.name = "Titular removido (LGPD)"
        local.email = f"excluido+{local.id}@anon.govcidadao.local"
        local.password_hash = get_password_hash(secrets.token_urlsafe(32))
        local.is_active = False
        await local.save()
        account_note = "conta_local_gov_anonimizada"
    else:
        ok = await anonymize_external_user(user.id)
        account_note = "conta_memorial_anonimizada" if ok else "conta_externa_nao_alterada"

    return {
        "ok": True,
        "userId": user.id,
        "occurrencesAnonymized": len(occurrences),
        "account": account_note,
        "message": (
            "Dados do Garça Cidadão anonimizados. Ocorrências públicas do município "
            "podem permanecer sem identificação do titular."
        ),
    }
