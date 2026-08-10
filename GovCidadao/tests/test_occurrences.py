"""Testes unitários de ocorrências (sem rede / Mongo)."""
import os
from datetime import datetime

import pytest

os.environ.setdefault("JWT_SECRET", "test-jwt-govcidadao-only")

from app.deps import CurrentUser
from app.models import Occurrence, OccurrenceSource, OccurrenceStatus, UrgencyLevel, UserRole
from app.routers.occurrences import (
    _build_recurrence_stats,
    _garca_fallback_coordinates,
    _normalize_text,
    _occurrence_belongs_to_citizen,
    _recurrence_level_from_count,
    _to_occurrence_read_secure,
    _urgency_with_boost,
)
from app.schemas import OccurrenceCreate


def _occ(**kwargs) -> Occurrence:
    base = dict(
        source=OccurrenceSource.INTERNAL,
        title="Buraco na via",
        description="Descrição",
        latitude=-21.95,
        longitude=-49.65,
        status=OccurrenceStatus.OPEN,
        address="Rua Teste",
        city="Garça",
        state="SP",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    base.update(kwargs)
    return Occurrence.model_construct(**base)


def test_normalize_text_strips_accents_and_spaces():
    assert _normalize_text("  São   Paulo  ") == "sao paulo"
    assert _normalize_text(None) == ""
    assert _normalize_text("") == ""


@pytest.mark.parametrize(
    "count,level",
    [(0, 0), (4, 0), (5, 1), (10, 2), (20, 3), (30, 4), (100, 4)],
)
def test_recurrence_level_from_count(count, level):
    assert _recurrence_level_from_count(count) == level


def test_urgency_with_boost_caps_at_critical():
    assert _urgency_with_boost(UrgencyLevel.LOW, 0) == UrgencyLevel.LOW
    assert _urgency_with_boost(UrgencyLevel.HIGH, 1) == UrgencyLevel.CRITICAL
    assert _urgency_with_boost(UrgencyLevel.CRITICAL, 5) == UrgencyLevel.CRITICAL


def test_occurrence_belongs_to_citizen_by_user_id_or_email():
    user = CurrentUser(
        id="user-1",
        name="Maria",
        email="maria@garca.sp.gov.br",
        role=UserRole.CITIZEN,
    )
    by_id = _occ(reporter_user_id="user-1", reporter_contact="outro@x.com")
    by_email = _occ(reporter_user_id=None, reporter_contact="maria@garca.sp.gov.br")
    other = _occ(reporter_user_id="other", reporter_contact="x@y.com")
    assert _occurrence_belongs_to_citizen(by_id, user) is True
    assert _occurrence_belongs_to_citizen(by_email, user) is True
    assert _occurrence_belongs_to_citizen(other, user) is False


def test_garca_fallback_requires_address_in_garca():
    payload = OccurrenceCreate(
        source=OccurrenceSource.INTERNAL,
        title="Buraco",
        description="Descrição teste",
        latitude=-21.95,
        longitude=-49.65,
        address="Rua A",
        city="Garça",
        state="SP",
    )
    coords = _garca_fallback_coordinates(payload)
    assert coords is not None
    assert abs(coords[0] - (-21.9478)) < 0.01

    payload_other_city = payload.model_copy(update={"city": "São Paulo"})
    assert _garca_fallback_coordinates(payload_other_city) is None


def test_build_recurrence_stats_resolved_has_zero_counts():
    open_row = _occ(status=OccurrenceStatus.OPEN, address="Rua A", number="10")
    open_row.id = "open-1"
    resolved = _occ(status=OccurrenceStatus.RESOLVED, address="Rua A", number="10")
    resolved.id = "res-1"
    stats = _build_recurrence_stats([open_row, resolved])
    assert stats["res-1"]["count"] == 0
    assert stats["open-1"]["count"] >= 1


def test_to_occurrence_read_secure_hides_address_from_other_citizen():
    row = _occ(
        reporter_user_id="owner",
        reporter_contact="owner@test.com",
        address="Rua Secreta",
        cep="17400-000",
    )
    row.id = "occ-1"
    owner = CurrentUser(
        id="owner",
        name="Owner",
        email="owner@test.com",
        role=UserRole.CITIZEN,
    )
    other = CurrentUser(
        id="other",
        name="Other",
        email="other@test.com",
        role=UserRole.CITIZEN,
    )
    own_read = _to_occurrence_read_secure(row, {"count": 0, "level": 0}, owner, keep_citizen_address=True)
    other_read = _to_occurrence_read_secure(row, {"count": 0, "level": 0}, other)
    assert own_read.address == "Rua Secreta"
    assert other_read.address is None
    assert other_read.reporter_contact is None
