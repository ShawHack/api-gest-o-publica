#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime

path = Path("/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js")
t = path.read_text(encoding="utf-8")
bak = path.with_name(path.name + f".bak-dates2-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_text(t, encoding="utf-8")

old = """    // Função auxiliar para data de exibição (criação)
    const getCreationDateStr = (dateString) => {
      const dt = new Date(dateString);
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' de ');
    };"""

new = """    // Parse YYYY-MM-DD as local date (evita UTC midnight → dia anterior no BR)
    const parseLocalDate = (value) => {
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
    };"""

if old not in t:
    # try without the useless replace
    old2 = """    const getCreationDateStr = (dateString) => {
      const dt = new Date(dateString);
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' de ');
    };"""
    if old2 in t:
        t = t.replace(old2, new.replace("    // Parse YYYY-MM-DD as local date (evita UTC midnight → dia anterior no BR)\n", "    // Parse YYYY-MM-DD as local date (evita UTC midnight → dia anterior no BR)\n"), 1)
    elif "function parseLocalDate" in t or "const parseLocalDate" in t:
        print("already patched parseLocalDate")
    else:
        raise SystemExit("getCreationDateStr block not found")
else:
    t = t.replace(old, new, 1)

t = t.replace("getCreationDateStr(post.dataCriacao)", "getCreationDateStr(post.createdAt || post.publishedAt || post.dataCriacao)")
t = t.replace("new Date(b.dataCriacao) - new Date(a.dataCriacao)", "(parseLocalDate(b.createdAt || b.publishedAt || b.dataCriacao) || 0) - (parseLocalDate(a.createdAt || a.publishedAt || a.dataCriacao) || 0)")
t = t.replace("const d = new Date(dateRaw);", "const d = parseLocalDate(dateRaw);")
t = t.replace("if (!isNaN(d.getTime())) {", "if (d) {")

# source copy
src = Path("/home/semit/Documentos/api-semit/cultura-src/eventos/eventos.js")
path.write_text(t, encoding="utf-8")
if src.exists():
    src.write_text(t, encoding="utf-8")
    print("synced cultura-src")

assert "parseLocalDate" in t
assert "new Date(dateRaw)" not in t
print("OK eventos.js")
