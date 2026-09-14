from pathlib import Path

ROLE = "admin_comtur"
ALIAS = "admin-comtur"
OLD = "['usuario', 'concessionario', 'admin', 'iluminacao_admin', 'rotas_operador', 'rotas_admin', 'admin-votacao', 'sama']"
NEW = "['usuario', 'concessionario', 'admin', 'iluminacao_admin', 'rotas_operador', 'rotas_admin', 'admin-votacao', 'admin_comtur', 'admin-comtur', 'sama']"

ENUM_OLD = """          'admin-votacao',
          'votacao_auditor',"""
ENUM_NEW = """          'admin-votacao',
          'admin_comtur',
          'admin-comtur',
          'votacao_auditor',"""

COUNTS_OLD = "const counts = { total, usuario: 0, concessionario: 0, admin: 0, iluminacao_admin: 0, admin_votacao: 0, sama: 0 }"
COUNTS_NEW = "const counts = { total, usuario: 0, concessionario: 0, admin: 0, iluminacao_admin: 0, admin_votacao: 0, admin_comtur: 0, sama: 0 }"


def patch_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    original = text
    if ROLE not in text or path.name == "User.js":
        if ENUM_OLD in text and ROLE not in text:
            text = text.replace(ENUM_OLD, ENUM_NEW, 1)
        text = text.replace(OLD, NEW)
        text = text.replace(COUNTS_OLD, COUNTS_NEW)
    if text == original:
        return "UNCHANGED " + path.name
    path.write_text(text, encoding="utf-8")
    return "PATCHED " + str(path)


roots = [
    Path("/home/semit/Documentos/api-gestao-publica/backend"),
    Path("/home/semit/Documentos/api-semit/backend"),
]
for root in roots:
    for rel in ("models/User.js", "controllers/UserController.js"):
        path = root / rel
        print(patch_text(path) if path.exists() else "MISSING " + str(path))
