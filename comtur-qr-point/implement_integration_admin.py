#!/usr/bin/env python3
"""Implement specialized integration form (Option A: connection catalog, no secrets)."""
from pathlib import Path
from datetime import datetime

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")

text = ADMIN.read_text(encoding="utf-8")
bak = ADMIN.with_name(f"comtur-content-admin.html.bak-integration-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_bytes(ADMIN.read_bytes())
print("ADMIN_BAK", bak.name)

FORM = r'''
          <!-- ================================================================= -->
          <!-- INTEGRATION / INTEGRAÇÃO FORM                                     -->
          <!-- ================================================================= -->
          <div id="integrationFields" class="comtur-category-fields" style="display:none">
            <div class="comtur-hint" style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px 16px; border-radius:8px; margin-bottom:16px; color:#1e3a8a; font-weight:600; font-size:0.88rem;">
              Catálogo de conexões do Portal de Turismo (sistemas, parceiros, APIs públicas e widgets). Não armazene chaves, tokens ou segredos neste cadastro.
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Identificação</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="intName">Nome da integração <span class="req">*</span></label>
                  <input id="intName" class="comtur-input" placeholder="Ex.: Sincronização com Mapaturístico">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="intSlug">Slug / identificador na URL <span class="req">*</span></label>
                  <input id="intSlug" class="comtur-input" placeholder="mapaturistico">
                </div>
                <div class="comtur-field">
                  <label for="intKind">Tipo <span class="req">*</span></label>
                  <select id="intKind" class="comtur-select">
                    <option value="Sistema interno" selected>Sistema interno</option>
                    <option value="Parceiro institucional">Parceiro institucional</option>
                    <option value="API pública">API pública</option>
                    <option value="Widget / embed">Widget / embed</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="intOrg">Órgão / responsável <span class="req">*</span></label>
                  <input id="intOrg" class="comtur-input" placeholder="Ex.: Secretaria de Turismo / SEMIT">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="intDescription">Descrição curta <span class="req">*</span></label>
                  <textarea id="intDescription" class="comtur-textarea" rows="3" placeholder="Para que serve esta integração..."></textarea>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Conexão</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="intSystem">Sistema / plataforma <span class="req">*</span></label>
                  <input id="intSystem" class="comtur-input" placeholder="Ex.: Mapaturístico, Agenda Cultural, Instagram">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="intPublicUrl">URL pública ou documentação</label>
                  <input id="intPublicUrl" class="comtur-input" placeholder="https://...">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="intWhat">O que é integrado <span class="req">*</span></label>
                  <textarea id="intWhat" class="comtur-textarea" rows="2" placeholder="Ex.: atrativos, eventos, posts, dados de hospedagem..."></textarea>
                </div>
                <div class="comtur-field">
                  <label for="intDirection">Direção <span class="req">*</span></label>
                  <select id="intDirection" class="comtur-select">
                    <option value="Entrada" selected>Entrada</option>
                    <option value="Saída">Saída</option>
                    <option value="Bidirecional">Bidirecional</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="intPeriodicity">Periodicidade <span class="req">*</span></label>
                  <select id="intPeriodicity" class="comtur-select">
                    <option value="Sob demanda" selected>Sob demanda</option>
                    <option value="Tempo real">Tempo real</option>
                    <option value="Diária">Diária</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Não definida">Não definida</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Situação operacional</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="intTechStatus">Status técnico <span class="req">*</span></label>
                  <select id="intTechStatus" class="comtur-select">
                    <option value="Ativa" selected>Ativa</option>
                    <option value="Em teste">Em teste</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Descontinuada">Descontinuada</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="intLastSync">Data da última sincronização</label>
                  <input id="intLastSync" type="date" class="comtur-input">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="intNotes">Observações / limitações</label>
                  <textarea id="intNotes" class="comtur-textarea" rows="3" placeholder="Limitações conhecidas, dependências, contatos técnicos..."></textarea>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Publicação</div>
              <div class="comtur-grid-2" style="margin-bottom:16px;">
                <div class="comtur-field">
                  <label for="intPublishDate">Data de publicação</label>
                  <input id="intPublishDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field" style="display:flex; flex-direction:column; justify-content:flex-end; gap:10px;">
                  <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                    <input id="intShowOnPortal" type="checkbox" checked>
                    <span>Visível no portal público</span>
                  </label>
                  <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                    <input id="intFeatured" type="checkbox">
                    <span>Exibir em destaque</span>
                  </label>
                </div>
              </div>
              <div class="comtur-actions-bar">
                <div class="comtur-actions-group">
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('draft')">💾 Salvar Rascunho</button>
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('review')">🔍 Enviar para Revisão</button>
                  <button type="button" class="comtur-btn comtur-btn-success" onclick="saveContent('published')">🚀 Publicar</button>
                </div>
                <div class="comtur-actions-group">
                  <button id="btnArchiveInt" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar</button>
                </div>
              </div>
            </div>
          </div>

'''

if 'id="integrationFields"' not in text:
    needle = "          <!-- 12. STANDARD / DOCUMENT FORM"
    if needle not in text:
        raise SystemExit("standard form marker missing")
    text = text.replace(needle, FORM + needle, 1)
    print("FORM_INSERTED")
else:
    print("FORM_EXISTS")

# specializedMap
if "'integration': 'integrationFields'" not in text:
    if "'open_data': 'openDataFields'\n    };" in text:
        text = text.replace(
            "'open_data': 'openDataFields'\n    };",
            "'open_data': 'openDataFields',\n      'integration': 'integrationFields'\n    };",
            1,
        )
    elif "'research': 'researchFields'\n    };" in text:
        text = text.replace(
            "'research': 'researchFields'\n    };",
            "'research': 'researchFields',\n      'integration': 'integrationFields'\n    };",
            1,
        )
    else:
        raise SystemExit("specializedMap end not found")
    print("MAP_UPDATED")

# archive hide
if "btnArchiveInt" in text and "if ($('btnArchiveInt')) $('btnArchiveInt').style.display = 'none';" not in text:
    for anchor in [
        "if ($('btnArchiveOd')) $('btnArchiveOd').style.display = 'none';",
        "if ($('btnArchiveRes')) $('btnArchiveRes').style.display = 'none';",
        "if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';",
    ]:
        if anchor in text:
            text = text.replace(
                anchor,
                anchor + "\n    if ($('btnArchiveInt')) $('btnArchiveInt').style.display = 'none';",
                1,
            )
            break

# listeners (slug from name)
LISTENERS = r'''
  if ($('intName') && $('intSlug')) {
    $('intName').addEventListener('input', function () {
      if ($('intSlug').dataset.manual === 'true') return;
      $('intSlug').value = slugify($('intName').value);
    });
    $('intSlug').addEventListener('input', function () {
      $('intSlug').dataset.manual = 'true';
    });
  }
'''

if "intName').addEventListener" not in text and "$('intName')" not in text.split("addEventListener")[0][-2000:]:
    if "window.uploadNewsCover = uploadNewsCover;" in text:
        text = text.replace(
            "window.uploadNewsCover = uploadNewsCover;",
            "window.uploadNewsCover = uploadNewsCover;\n" + LISTENERS,
            1,
        )
        print("LISTENERS_INSERTED")
    elif "  // --- SAVE ACTION ---" in text:
        text = text.replace("  // --- SAVE ACTION ---", LISTENERS + "\n  // --- SAVE ACTION ---", 1)
        print("LISTENERS_INSERTED_SAVE")

RESET = r'''
    if (currentType === 'integration') {
      if ($('intName')) $('intName').value = '';
      if ($('intSlug')) { $('intSlug').value = ''; delete $('intSlug').dataset.manual; }
      if ($('intKind')) $('intKind').value = 'Sistema interno';
      if ($('intOrg')) $('intOrg').value = '';
      if ($('intDescription')) $('intDescription').value = '';
      if ($('intSystem')) $('intSystem').value = '';
      if ($('intPublicUrl')) $('intPublicUrl').value = '';
      if ($('intWhat')) $('intWhat').value = '';
      if ($('intDirection')) $('intDirection').value = 'Entrada';
      if ($('intPeriodicity')) $('intPeriodicity').value = 'Sob demanda';
      if ($('intTechStatus')) $('intTechStatus').value = 'Ativa';
      if ($('intLastSync')) $('intLastSync').value = '';
      if ($('intNotes')) $('intNotes').value = '';
      if ($('intPublishDate')) $('intPublishDate').value = new Date().toISOString().slice(0, 10);
      if ($('intShowOnPortal')) $('intShowOnPortal').checked = true;
      if ($('intFeatured')) $('intFeatured').checked = false;
      if ($('btnArchiveInt')) $('btnArchiveInt').style.display = 'none';
    }
'''

reset_chunk = text.split("function resetForm")[1][:16000] if "function resetForm" in text else ""
if "if (currentType === 'integration')" not in reset_chunk:
    if "if (currentType === 'open_data')" in text:
        text = text.replace("    if (currentType === 'open_data') {", RESET + "\n    if (currentType === 'open_data') {", 1)
    elif "if (currentType === 'research')" in text:
        text = text.replace("    if (currentType === 'research') {", RESET + "\n    if (currentType === 'research') {", 1)
    else:
        text = text.replace("    if (clearSidebarActive) {", RESET + "\n    if (clearSidebarActive) {", 1)
    print("RESET_INSERTED")

LOAD = r'''
    } else if (item.type === 'integration') {
      const meta = item.metadata || {};
      if ($('intName')) $('intName').value = item.title || '';
      if ($('intSlug')) { $('intSlug').value = item.slug || ''; $('intSlug').dataset.manual = 'true'; }
      if ($('intKind')) $('intKind').value = meta.kind || meta.integrationType || 'Sistema interno';
      if ($('intOrg')) $('intOrg').value = meta.responsibleBody || item.location || '';
      if ($('intDescription')) $('intDescription').value = meta.description || item.summary || '';
      if ($('intSystem')) $('intSystem').value = meta.system || meta.platform || '';
      if ($('intPublicUrl')) $('intPublicUrl').value = meta.publicUrl || meta.documentationUrl || '';
      if ($('intWhat')) $('intWhat').value = meta.integratesWhat || meta.scope || '';
      if ($('intDirection')) $('intDirection').value = meta.direction || 'Entrada';
      if ($('intPeriodicity')) $('intPeriodicity').value = meta.periodicity || 'Sob demanda';
      if ($('intTechStatus')) $('intTechStatus').value = meta.techStatus || 'Ativa';
      if ($('intLastSync')) $('intLastSync').value = meta.lastSync ? String(meta.lastSync).slice(0, 10) : '';
      if ($('intNotes')) $('intNotes').value = meta.notes || item.body || '';
      if ($('intPublishDate')) $('intPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('intShowOnPortal')) $('intShowOnPortal').checked = meta.showOnPortal !== false;
      if ($('intFeatured')) $('intFeatured').checked = item.featured === true;
      if ($('btnArchiveInt')) $('btnArchiveInt').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
'''

if "item.type === 'integration'" not in text:
    if "item.type === 'open_data'" in text:
        text = text.replace("    } else if (item.type === 'open_data') {", LOAD + "\n    } else if (item.type === 'open_data') {", 1)
    elif "item.type === 'research'" in text:
        text = text.replace("    } else if (item.type === 'research') {", LOAD + "\n    } else if (item.type === 'research') {", 1)
    else:
        text = text.replace(
            "      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';\n    } else {",
            "      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';\n" + LOAD + "\n    } else {",
            1,
        )
    print("LOAD_INSERTED")

BUILD = r'''
    if (currentType === 'integration') {
      const title = $('intName').value.trim();
      if (!title) { showNotice('Informe o nome da integração.', true); return null; }
      const slug = slugify($('intSlug').value) || slugify(title);
      if (!slug) { showNotice('Informe o slug da integração.', true); return null; }
      const description = $('intDescription').value.trim();
      if (!description) { showNotice('Informe a descrição curta.', true); return null; }
      const org = $('intOrg').value.trim();
      if (!org) { showNotice('Informe o órgão / responsável.', true); return null; }
      const kind = $('intKind').value;
      if (!kind) { showNotice('Selecione o tipo da integração.', true); return null; }
      const system = $('intSystem').value.trim();
      if (!system) { showNotice('Informe o sistema / plataforma.', true); return null; }
      const integratesWhat = $('intWhat').value.trim();
      if (!integratesWhat) { showNotice('Informe o que é integrado.', true); return null; }
      const direction = $('intDirection').value;
      if (!direction) { showNotice('Selecione a direção.', true); return null; }
      const periodicity = $('intPeriodicity').value;
      if (!periodicity) { showNotice('Selecione a periodicidade.', true); return null; }
      const techStatus = $('intTechStatus').value;
      if (!techStatus) { showNotice('Selecione o status técnico.', true); return null; }
      const publicUrl = $('intPublicUrl').value.trim();
      if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
        showNotice('A URL pública deve começar com http:// ou https://.', true); return null;
      }
      const showOnPortal = $('intShowOnPortal').checked === true;
      const pubDateVal = $('intPublishDate').value;
      const publishedAt = pubDateVal ? new Date(pubDateVal).toISOString() : (statusToSave === 'published' ? new Date().toISOString() : undefined);
      return {
        type: 'integration',
        title,
        slug,
        summary: description,
        body: $('intNotes').value.trim(),
        location: org,
        featured: $('intFeatured').checked === true,
        publishedAt,
        status: statusToSave || 'draft',
        media: [],
        metadata: {
          description,
          kind,
          integrationType: kind,
          responsibleBody: org,
          system,
          platform: system,
          publicUrl,
          documentationUrl: publicUrl,
          integratesWhat,
          scope: integratesWhat,
          direction,
          periodicity,
          techStatus,
          lastSync: $('intLastSync').value || null,
          notes: $('intNotes').value.trim(),
          showOnPortal,
          // never store secrets here
          noSecrets: true
        }
      };
    }

'''

if "if (currentType === 'integration')" not in text.split("// Default / Standard")[0][-6000:]:
    text = text.replace(
        "    // Default / Standard\n    const name = $('stdTitle').value.trim();",
        BUILD + "    // Default / Standard\n    const name = $('stdTitle').value.trim();",
        1,
    )
    print("BUILD_INSERTED")

# empty list
if "Nenhuma integração cadastrada" not in text:
    # fix typo if present "Nenhum integração"
    text = text.replace("Nenhum integração cadastrado", "Nenhuma integração cadastrada")
    if "currentType === 'open_data'" in text and "Nenhum conjunto de dados cadastrado" in text:
        text = text.replace(
            """      } else if (currentType === 'open_data') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhum conjunto encontrado.' : 'Nenhum conjunto de dados cadastrado.'}</div>`;
      }""",
            """      } else if (currentType === 'open_data') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhum conjunto encontrado.' : 'Nenhum conjunto de dados cadastrado.'}</div>`;
      } else if (currentType === 'integration') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma integração encontrada.' : 'Nenhuma integração cadastrada.'}</div>`;
      }""",
            1,
        )
        print("EMPTY_MSG")
    elif "Nenhuma integração cadastrada" not in text:
        # fallback after news
        text = text.replace(
            """      } else if (currentType === 'news') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>`;
      }""",
            """      } else if (currentType === 'news') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>`;
      } else if (currentType === 'integration') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma integração encontrada.' : 'Nenhuma integração cadastrada.'}</div>`;
      }""",
            1,
        )
        print("EMPTY_MSG_FALLBACK")

# list card
render_list = text.split("function renderList")[1][:35000] if "function renderList" in text else ""
if "item.type === 'integration'" not in render_list:
    card = r'''
      if (item.type === 'integration') {
        const meta = item.metadata || {};
        const tech = meta.techStatus || '—';
        const system = meta.system || meta.platform || '';
        const kind = meta.kind || meta.integrationType || '';
        return `
          <button class="comtur-list-item ${isActive ? 'is-active' : ''}" type="button" data-id="${item._id}" style="padding:10px 12px; width:100%; text-align:left;">
            <div class="comtur-list-title" style="font-weight:700; font-size:0.92rem; margin-bottom:4px;">${escapeHtml(item.title || 'Sem título')}</div>
            <div style="font-size:0.78rem; color:var(--comtur-text-muted); margin-bottom:6px;">${escapeHtml(system)}${kind ? ' · ' + escapeHtml(kind) : ''}</div>
            <div class="comtur-list-meta" style="display:flex; justify-content:space-between; align-items:center;">
              <span class="comtur-badge ${statusClass}">${statusLabel}</span>
              <span style="font-size:0.72rem; color:#64748b;">${escapeHtml(tech)}</span>
            </div>
          </button>
        `;
      }

'''
    if "if (item.type === 'open_data')" in text:
        text = text.replace("      if (item.type === 'open_data') {", card + "      if (item.type === 'open_data') {", 1)
        print("LIST_CARD")
    elif "if (item.type === 'research')" in text:
        text = text.replace("      if (item.type === 'research') {", card + "      if (item.type === 'research') {", 1)
        print("LIST_CARD_RES")
    elif "// 7. Default Standard Card" in text:
        text = text.replace("// 7. Default Standard Card", card + "      // 7. Default Standard Card", 1)
        print("LIST_CARD_DEFAULT")

ADMIN.write_text(text, encoding="utf-8")
print("ADMIN_SIZE", ADMIN.stat().st_size)

nt = NAV.read_text(encoding="utf-8")
nt2 = (
    nt.replace("comtur-content-admin.html?v=18", "comtur-content-admin.html?v=19")
      .replace("comtur-content-admin.html?v=17", "comtur-content-admin.html?v=19")
      .replace("comtur-content-admin.html?v=15", "comtur-content-admin.html?v=19")
)
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v19")

print("DONE_ADMIN")
