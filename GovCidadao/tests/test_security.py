from app.security import get_password_hash, verify_password


def test_password_hash_roundtrip():
    raw = "senha-teste-123"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("outra", hashed) is False
