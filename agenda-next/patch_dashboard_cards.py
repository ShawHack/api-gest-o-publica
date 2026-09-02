#!/usr/bin/env python3
from pathlib import Path

p = Path("/home/semit/Documentos/api-semit/backend/private/dashboard-app.html")
bak = Path("/home/semit/Documentos/api-semit/backend/private/dashboard-app.html.bak.cards-20260828")
text = p.read_text(encoding="utf-8")
if not bak.exists():
    bak.write_text(text, encoding="utf-8")

css = """
        .card-senhas {
            --card-color-1: #059669;
            --card-color-2: #10b981;
        }
"""

if ".card-senhas {" not in text:
    if ".card-tv-semit {" in text:
        text = text.replace(".card-tv-semit {", css + "\n        .card-tv-semit {", 1)
    elif ".card-dsu {" in text:
        text = text.replace(".card-dsu {", css + "\n        .card-dsu {", 1)
    else:
        raise SystemExit("CSS insertion point not found")

card = """
            <!-- Card: Gestão de Atendimento & Senhas (NovoSGA) -->
            <div class="card card-senhas" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span class="card-icon">🎟️</span>
                        <span class="card-badge badge-new" style="background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3);">NovoSGA</span>
                    </div>
                    <h2 class="card-title">Gestão de Atendimento & Senhas</h2>
                    <p class="card-description">
                        Controle de guichês, filas em tempo real, painéis de chamada para TVs e emissão de senhas em totens.
                    </p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                    <a href="/senhas/" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 7px 12px; border-radius: 8px; background: #f8fafc; color: #1e293b; font-size: 0.85rem; font-weight: 600; border: 1px solid #e2e8f0;">
                        <span>🏢 Gerenciador Geral (SGA)</span>
                        <span style="color: #059669; font-weight: 700;">↗</span>
                    </a>
                    <a href="/admin" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 7px 12px; border-radius: 8px; background: #f0fdf4; color: #166534; font-size: 0.85rem; font-weight: 600; border: 1px solid #bbf7d0;">
                        <span>📺 Painel de Chamada (TV)</span>
                        <span style="color: #166534; font-weight: 700;">↗</span>
                    </a>
                    <a href="/triagem/#/settings" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 7px 12px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; font-size: 0.85rem; font-weight: 600; border: 1px solid #bfdbfe;">
                        <span>📱 Totem de Triagem</span>
                        <span style="color: #1d4ed8; font-weight: 700;">↗</span>
                    </a>
                </div>
            </div>

"""

if "Gestão de Atendimento & Senhas" not in text:
    target = '<a href="/tv/admin.html" class="card card-tv-semit">'
    if target not in text:
        raise SystemExit("TV card insertion point not found")
    text = text.replace(target, card + "            " + target, 1)

p.write_text(text, encoding="utf-8")
print("ok")
print("has_card", "Gestão de Atendimento & Senhas" in text)
print("has_sga", 'href="/senhas/"' in text)
print("has_admin", 'href="/admin"' in text)
