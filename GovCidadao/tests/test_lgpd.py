"""Testes LGPD (filtros e contrato — sem Mongo)."""
import os

os.environ.setdefault("JWT_SECRET", "test-jwt-govcidadao-only")

from app.deps import CurrentUser
from app.models import UserRole
from app.services.lgpd_subject import _citizen_occurrence_filter, _safe_profile


def test_citizen_occurrence_filter_by_id_and_email():
    user = CurrentUser(
        id="abc123",
        name="João",
        email="Joao@Garca.SP.GOV.BR",
        role=UserRole.CITIZEN,
    )
    filt = _citizen_occurrence_filter(user)
    assert filt["$or"][0] == {"reporter_user_id": "abc123"}
    assert "reporter_contact" in filt["$or"][1]


def test_safe_profile_masks_nothing_extra():
    user = CurrentUser(
        id="u1",
        name="Maria",
        email="maria@test.local",
        role=UserRole.CITIZEN,
    )
    p = _safe_profile(user)
    assert p["email"] == "maria@test.local"
    assert p["role"] == "citizen"
