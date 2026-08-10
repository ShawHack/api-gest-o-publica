"""Testes unitários do serviço de auditoria Gov (sem Mongo)."""
import os

os.environ.setdefault("JWT_SECRET", "test-jwt-govcidadao-only")

from app.services.audit_service import (
    build_changes,
    infer_event_type,
    mask_value,
    parse_client,
    sanitize_metadata,
)


def test_mask_value_redacts_password_and_email():
    assert mask_value("password", "secret") == "[redacted]"
    assert mask_value("email", "joao@example.com") == "jo***@example.com"


def test_sanitize_metadata_strips_sensitive():
    out = sanitize_metadata({"password": "x", "city": "Garça"})
    assert "password" not in out
    assert out["city"] == "Garça"


def test_build_changes_only_diff():
    changes = build_changes({"status": "open"}, {"status": "resolved"}, ["status"])
    assert len(changes) == 1
    assert changes[0]["campo"] == "status"


def test_infer_event_type_gov_actions():
    assert infer_event_type("gov.auth.login_success") == "LOGIN"
    assert infer_event_type("gov.occurrence.create") == "CREATE"
    assert infer_event_type("gov.authz.denied") == "SECURITY"
    assert infer_event_type("gov.lgpd.export") == "VIEW"


class _FakeHeaders:
    def __init__(self, data):
        self._data = data

    def get(self, key, default=None):
        return self._data.get(key, default)


class _FakeRequest:
    def __init__(self):
        self.headers = _FakeHeaders(
            {
                "x-client-app": "gov_portal",
                "x-request-id": "req-99",
            }
        )


def test_parse_client_headers():
    client = parse_client(_FakeRequest())
    assert client["app"] == "gov_portal"
    assert client["requestId"] == "req-99"
