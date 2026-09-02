#!/usr/bin/env python3
from pathlib import Path

p = Path("/home/semit/Documentos/api-semit/backend/private/dashboard-app.html")
t = p.read_text(encoding="utf-8")
if "card-agendamentos" in t and 'href="/agendamentos/"' in t:
    print("already_present")
    raise SystemExit(0)

css = """
        .card-agendamentos {
            --card-color-1: #2563eb;
            --card-color-2: #06b6d4;
        }
"""
if ".card-agendamentos {" not in t:
    needle = ".card-senhas {"
    if needle not in t:
        raise SystemExit("css point missing")
    t = t.replace(needle, css + "\n        " + needle.lstrip(), 1)

title = "Agendamentos"
desc = (
    "Agenda Gar\u00e7a: cat\u00e1logo de servi\u00e7os, hor\u00e1rios, "
    "landing p\u00fablica e marca\u00e7\u00e3o de atendimento."
)
card = f"""            <!-- Card: Agenda Garca -->
            <a href="/agendamentos/" class="card card-agendamentos">
                <span class="card-icon">&#128197;</span>
                <h2 class="card-title">{title}</h2>
                <p class="card-description">
                    {desc}
                </p>
                <span class="card-badge badge-new">Novo</span>
            </a>

"""
# Use unicode in comment too
card = card.replace("Agenda Garca", "Agenda Gar\u00e7a")

marker = '            <!-- Card 14: Ferramentas do MITI -->'
if marker not in t:
    raise SystemExit("ferramentas marker missing")
t2 = t.replace(marker, card + marker, 1)

if t2.count("<div") != t2.count("</div>"):
    raise SystemExit("div mismatch abort")
if "TV Semit" not in t2 or "Gest\u00e3o de Atendimento" not in t2:
    raise SystemExit("senhas/tv missing abort")
p.write_text(t2, encoding="utf-8")
print("ok")
print("divs", t2.count("<div"), t2.count("</div>"))
print("has_agenda", 'href="/agendamentos/"' in t2)
