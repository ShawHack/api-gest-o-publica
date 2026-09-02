#!/usr/bin/env python3
from pathlib import Path

p = Path("/home/semit/Documentos/api-semit/backend/private/dashboard-app.html")
t = p.read_text(encoding="utf-8")

start = t.find('class="card card-senhas"')
if start < 0:
    raise SystemExit("senhas card not found")
start = t.rfind("<!--", 0, start)
end = t.find('<a href="/tv/admin.html" class="card card-tv-semit">')
if start < 0 or end < 0 or start >= end:
    raise SystemExit("insertion bounds invalid")

card = """            <!-- Card: Gestao de Atendimento e Senhas (NovoSGA) -->
            <div class="card card-senhas" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span class="card-icon">&#127915;</span>
                        <span class="card-badge badge-new" style="background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3);">NovoSGA</span>
                    </div>
                    <h2 class="card-title">Gestao de Atendimento &amp; Senhas</h2>
                    <p class="card-description">
                        Controle de guiches, filas em tempo real, paineis de chamada para TVs e emissao de senhas em totens.
                    </p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                    <a href="/senhas/" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 7px 12px; border-radius: 8px; background: #f8fafc; color: #1e293b; font-size: 0.85rem; font-weight: 600; border: 1px solid #e2e8f0;">
                        <span>Gerenciador Geral (SGA)</span>
                        <span style="color: #059669; font-weight: 700;">&nearr;</span>
                    </a>
                    <a href="/admin" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 7px 12px; border-radius: 8px; background: #f0fdf4; color: #166534; font-size: 0.85rem; font-weight: 600; border: 1px solid #bbf7d0;">
                        <span>Painel de Chamada (TV)</span>
                        <span style="color: #166534; font-weight: 700;">&nearr;</span>
                    </a>
                    <a href="/triagem/#/settings" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 7px 12px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; font-size: 0.85rem; font-weight: 600; border: 1px solid #bfdbfe;">
                        <span>Totem de Triagem</span>
                        <span style="color: #1d4ed8; font-weight: 700;">&nearr;</span>
                    </a>
                </div>
            </div>

            """

# Restore Portuguese with unicode escapes only (script stays ASCII)
card = (
    card.replace("Gestao de Atendimento e Senhas", "Gest\u00e3o de Atendimento & Senhas")
    .replace("Gestao de Atendimento &amp; Senhas", "Gest\u00e3o de Atendimento &amp; Senhas")
    .replace("guiches", "guich\u00eas")
    .replace("paineis", "pain\u00e9is")
    .replace("emissao", "emiss\u00e3o")
)

t2 = t[:start] + card + t[end:]
if t2.count("<div") != t2.count("</div>"):
    raise SystemExit("div mismatch, aborting write")
if t2.count("card-tv-semit") != t.count("card-tv-semit"):
    raise SystemExit("tv card count changed, aborting")
if "Ferramentas do MITI" not in t2 or "TV Semit" not in t2:
    raise SystemExit("other cards missing, aborting")
p.write_text(t2, encoding="utf-8")
print("fixed")
print("divs", t2.count("<div"), t2.count("</div>"))
print("ok_title", "Gest\u00e3o de Atendimento" in t2)
print("before_tv", t2.find("card-senhas") < t2.find('href="/tv/admin.html"'))
