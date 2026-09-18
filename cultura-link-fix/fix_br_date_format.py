#!/usr/bin/env python3
"""Format Cultura event dates as DD/MM/YYYY on public cards."""
from pathlib import Path
from datetime import datetime

files = [
    Path("/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js"),
    Path("/home/semit/Documentos/api-semit/cultura-src/eventos/eventos.js"),
    Path("/home/semit/Documentos/api-semit/backend/public/cultura/eventos/detalhes.js"),
    Path("/home/semit/Documentos/api-semit/cultura-src/eventos/detalhes.js"),
]

def ensure_helpers(t: str) -> str:
    if "function formatBrDate" in t or "const formatBrDate" in t:
        return t
    helper = """
    const formatBrDate = (value) => {
      if (!value) return '';
      const s = String(value).trim();
      const iso = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
      if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
      const br = s.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
      if (br) return s;
      const d = (typeof parseLocalDate === 'function') ? parseLocalDate(s) : new Date(s);
      if (!d || isNaN(d.getTime())) return s;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    };
"""
    # insert after parseLocalDate block if present, else before getCreationDateStr
    if "const getCreationDateStr" in t:
        return t.replace("const getCreationDateStr", helper + "\n    const getCreationDateStr", 1)
    if "async function loadPosts" in t:
        return t.replace("async function loadPosts", helper + "\nasync function loadPosts", 1)
    return helper + t


for path in files:
    if not path.exists():
        print("skip", path)
        continue
    t = path.read_text(encoding="utf-8")
    bak = path.with_name(path.name + f".bak-brdate-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    bak.write_text(t, encoding="utf-8")
    t = ensure_helpers(t)

    # Main card line that shows raw ISO date
    old1 = "eventDateStr = sess.data + (timeLabel ? ' · ' + timeLabel : '');"
    new1 = "eventDateStr = formatBrDate(sess.data) + (timeLabel ? ' · ' + timeLabel : '');"
    if old1 in t:
        t = t.replace(old1, new1)
        print(path.name, "patched card date")
    else:
        print(path.name, "card pattern missing")

    # Upcoming sidebar still prints dateRaw raw
    old2 = "${dateRaw} · ${post.datasHorarios[0].horarioLabel"
    new2 = "${formatBrDate(dateRaw)} · ${post.datasHorarios[0].horarioLabel"
    if old2 in t:
        t = t.replace(old2, new2)
        print(path.name, "patched upcoming date")

    path.write_text(t, encoding="utf-8")

# verify live public file
live = Path("/home/semit/Documentos/api-semit/backend/public/cultura/eventos/eventos.js").read_text(encoding="utf-8")
assert "formatBrDate(sess.data)" in live
assert "formatBrDate" in live
print("OK")
