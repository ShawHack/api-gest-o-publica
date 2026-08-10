import os

os.environ.setdefault("JWT_SECRET", "test-jwt-govcidadao-only")

from app.security import create_access_token, decode_access_token


def test_access_token_encode_decode():
    token = create_access_token(subject="507f1f77bcf86cd799439011", role="citizen")
    assert isinstance(token, str)
    payload = decode_access_token(token)
    assert payload["sub"] == "507f1f77bcf86cd799439011"
    assert payload["role"] == "citizen"
    assert "exp" in payload
