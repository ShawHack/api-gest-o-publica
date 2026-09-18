#!/usr/bin/env python3
"""Fix Cultura date display: local YYYY-MM-DD parse + createdAt instead of dataCriacao."""
from pathlib import Path
from datetime import datetime

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/cultura/admin.html")
EVENTOS = Path("/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js")
SRC_ADMIN = Path("/home/semit/Documentos/api-semit/cultura-src/admin.html")
SRC_EVENTOS = Path("/home/semit/Documentos/api-semit/cultura-src/eventos/eventos.js")

HELPER = r'''
    // Parse YYYY-MM-DD as local calendar date (avoid UTC midnight → dia anterior no BR)
    function parseLocalDate(value) {
      if (!value) return null;
      if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
      const s = String(value).trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    function formatLocalDate(value, opts) {
      const d = parseLocalDate(value);
      if (!d) return '—';
      return d.toLocaleDateString('pt-BR', opts || undefined);
    }
'''

def patch_admin(path: Path):
    if not path.exists():
        print("skip missing", path)
        return
    t = path.read_text(encoding="utf-8")
    bak = path.with_name(path.name + f".bak-dates-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    bak.write_text(t, encoding="utf-8")

    old = "Criado em: ${new Date(post.dataCriacao).toLocaleDateString('pt-BR')}"
    new = "Criado em: ${formatLocalDate(post.createdAt || post.publishedAt || post.dataCriacao)}"
    if old not in t:
        raise SystemExit(f"admin pattern not found in {path}")
    t = t.replace(old, new, 1)

    # inject helpers once near loadPosts
    if "function parseLocalDate" not in t:
        anchor = "async function loadPosts()"
        if anchor not in t:
            anchor = "function loadPosts()"
        if anchor not in t:
            raise SystemExit("loadPosts not found")
        t = t.replace(anchor, HELPER + "\n    " + anchor, 1)

    path.write_text(t, encoding="utf-8")
    print("patched admin", path)


def patch_eventos(path: Path):
    if not path.exists():
        print("skip missing", path)
        return
    t = path.read_text(encoding="utf-8")
    bak = path.with_name(path.name + f".bak-dates-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    bak.write_text(t, encoding="utf-8")

    # Replace getCreationDateStr body
    import re
    t2, n = re.subn(
        r"const getCreationDateStr\s*=\s*\(dateString\)\s*=>\s*\{[\s\S]*?\};",
        """const parseLocalDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
      const s = String(value).trim();
      const m = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const getCreationDateStr = (dateString) => {
      const dt = parseLocalDate(dateString);
      if (!dt) return '—';
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };""",
        t,
        count=1,
    )
    if n != 1:
        # maybe already different; try inject if missing
        if "parseLocalDate" not in t:
            raise SystemExit(f"getCreationDateStr not found in {path}")
        t2 = t

    # Fix upcoming event day parse
    t2 = t2.replace(
        "const dateRaw = post.datasHorarios[0].data; \n            const d = new Date(dateRaw);\n            if (!isNaN(d.getTime())) {\n              day = String(d.getDate()).padStart(2, '0');\n              monthStr = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');",
        "const dateRaw = post.datasHorarios[0].data;\n            const d = parseLocalDate(dateRaw);\n            if (d) {\n              day = String(d.getDate()).padStart(2, '0');\n              monthStr = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');",
    )
    # also without exact whitespace
    t2 = t2.replace("const d = new Date(dateRaw);", "const d = parseLocalDate(dateRaw);")
    t2 = t2.replace("if (!isNaN(d.getTime()))", "if (d)")

    # sort by createdAt
    t2 = t2.replace(
        "new Date(b.dataCriacao) - new Date(a.dataCriacao)",
        "parseLocalDate(b.createdAt || b.publishedAt || b.dataCriacao) - parseLocalDate(a.createdAt || a.publishedAt || a.dataCriacao)",
    )
    t2 = t2.replace(
        "getCreationDateStr(post.dataCriacao)",
        "getCreationDateStr(post.createdAt || post.publishedAt || post.dataCriacao)",
    )

    path.write_text(t2, encoding="utf-8")
    print("patched eventos", path)


patch_admin(ADMIN)
patch_eventos(EVENTOS)
# keep source in sync if present
if SRC_ADMIN.exists():
    patch_admin(SRC_ADMIN)
if SRC_EVENTOS.exists():
    patch_eventos(SRC_EVENTOS)

print("DONE")
