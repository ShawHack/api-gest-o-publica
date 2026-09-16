#!/usr/bin/env python3
"""Patch comtur-content-admin.html for specialized qr_point form."""
from pathlib import Path

HTML = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
text = HTML.read_text(encoding="utf-8")
orig = text

QR_FORM = r'''
          <!-- ================================================================= -->
          <!-- 12b. QR POINT FORM (placa física + destino)                        -->
          <!-- ================================================================= -->
          <div id="qrPointFields" class="comtur-category-fields" style="display:none">
            <div class="comtur-hint" style="background:#ecfdf5; border:1px solid #a7f3d0; padding:12px 16px; border-radius:8px; margin-bottom:16px; color:#065f46; font-weight:600; font-size:0.88rem;">
              Cadastre a placa QR, o local de instalação e o destino aberto ao escanear.
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Identificação</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="qrTitle">Nome do ponto QR <span class="req">*</span></label>
                  <input id="qrTitle" class="comtur-input" placeholder="Ex.: Placa do Lago Artificial">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="qrSlug">Identificador na URL (slug) <span class="req">*</span></label>
                  <input id="qrSlug" class="comtur-input" placeholder="placa-lago-artificial">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="qrSummary">Resumo / orientação ao turista</label>
                  <textarea id="qrSummary" class="comtur-textarea" rows="2" placeholder="Texto curto exibido no portal..."></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="qrBody">Descrição / observações internas</label>
                  <textarea id="qrBody" class="comtur-textarea" rows="3" placeholder="Notas de instalação, manutenção, etc."></textarea>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Placa QR</div>
              <div class="comtur-grid-2">
                <div class="comtur-field" style="display:flex; align-items:center; gap:10px;">
                  <input id="qrEnabled" type="checkbox" style="width:18px; height:18px; accent-color:var(--comtur-primary); cursor:pointer;">
                  <label for="qrEnabled" style="font-weight:700; cursor:pointer; margin:0;">Placa ativa / habilitada</label>
                </div>
                <div class="comtur-field">
                  <label for="qrStatus">Estado operacional <span class="req">*</span></label>
                  <select id="qrStatus" class="comtur-select">
                    <option value="planned">Planejada</option>
                    <option value="installed" selected>Instalada</option>
                    <option value="maintenance">Em manutenção</option>
                    <option value="disabled">Desativada</option>
                  </select>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="qrCode">Código da placa <span class="req">*</span></label>
                  <input id="qrCode" class="comtur-input" placeholder="Ex.: GARCA-QR-001" maxlength="120">
                  <small style="color:#64748b;">Obrigatório quando a placa estiver ativa.</small>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="qrInstallLocation">Local de instalação da placa</label>
                  <input id="qrInstallLocation" class="comtur-input" placeholder="Ex.: Entrada principal do Bosque, poste 3">
                </div>
                <div class="comtur-field">
                  <label for="qrInstalledAt">Data de instalação</label>
                  <input id="qrInstalledAt" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="qrLastMaintenanceAt">Última manutenção</label>
                  <input id="qrLastMaintenanceAt" type="date" class="comtur-input">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Destino ao escanear</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="qrDestKind">Tipo de destino</label>
                  <select id="qrDestKind" class="comtur-select" onchange="updateQrDestinationPreview()">
                    <option value="portal_local" selected>Página do portal (/turismo/local/...)</option>
                    <option value="content">Conteúdo COMTUR (/turismo/conteudo/...)</option>
                    <option value="external">URL externa</option>
                  </select>
                </div>
                <div class="comtur-field" id="qrDestSlugWrap">
                  <label for="qrDestSlug">Slug de destino</label>
                  <input id="qrDestSlug" class="comtur-input" placeholder="slug-do-atrativo" oninput="updateQrDestinationPreview()">
                </div>
                <div class="comtur-field comtur-grid-full" id="qrDestUrlWrap" style="display:none;">
                  <label for="qrDestUrl">URL externa</label>
                  <input id="qrDestUrl" class="comtur-input" placeholder="https://..." oninput="updateQrDestinationPreview()">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label>URL sugerida para gravar no QR</label>
                  <div id="qrDestPreview" style="font-family:ui-monospace,monospace; font-size:0.85rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; word-break:break-all; color:#0f172a;">—</div>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Coordenadas do ponto físico</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="qrLocation">Endereço / referência</label>
                  <input id="qrLocation" class="comtur-input" placeholder="Ex.: Av. Dr. Luís Carlos, Bosque Municipal">
                </div>
                <div class="comtur-field">
                  <label for="qrLat">Latitude</label>
                  <input id="qrLat" class="comtur-input" inputmode="decimal" placeholder="-22.21">
                </div>
                <div class="comtur-field">
                  <label for="qrLng">Longitude</label>
                  <input id="qrLng" class="comtur-input" inputmode="decimal" placeholder="-49.65">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">★</span> Publicação</div>
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
                <input id="qrFeatured" type="checkbox" style="width:18px; height:18px; accent-color:var(--comtur-primary); cursor:pointer;">
                <label for="qrFeatured" style="font-weight:700; cursor:pointer;">Exibir em evidência / Destaque</label>
              </div>
              <div class="comtur-actions-bar">
                <div class="comtur-actions-group">
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('draft')">💾 Salvar Rascunho</button>
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('review')">🔍 Enviar para Revisão</button>
                  <button type="button" class="comtur-btn comtur-btn-success" onclick="saveContent('published')">🚀 Publicar Imediatamente</button>
                </div>
                <div class="comtur-actions-group">
                  <button id="btnArchiveQr" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar</button>
                </div>
              </div>
            </div>
          </div>

'''

needle = '          <!-- 12. STANDARD / DOCUMENT FORM (Generic Fallback for indicator, research, open_data, qr_point, integration, news) -->'
if 'id="qrPointFields"' not in text:
    if needle not in text:
        raise SystemExit('standard form marker not found')
    text = text.replace(
        needle,
        QR_FORM + '          <!-- 12. STANDARD / DOCUMENT FORM (Generic Fallback for research, open_data, integration) -->',
        1,
    )
else:
    print('FORM_ALREADY_PRESENT')

# specializedMap
old_map = """    const specializedMap = {
      'event': 'eventFields',
      'attraction': 'attractionFields',
      'gastronomy': 'gastronomyFields',
      'lodging': 'lodgingFields',
      'route': 'routeFields',
      'shopping': 'shoppingFields',
      'service': 'serviceFields',
      'council_member': 'councilMemberFields',
      'legislation': 'legislationFields',
      'work_plan': 'workPlanFields',
      'accountability': 'accountabilityFields',
      'indicator': 'indicatorFields',
      'news': 'newsFields'
    };"""
new_map = old_map.replace(
    "'news': 'newsFields'\n    };",
    "'news': 'newsFields',\n      'qr_point': 'qrPointFields'\n    };",
)
if old_map not in text:
    if "'qr_point': 'qrPointFields'" not in text:
        raise SystemExit('specializedMap not found')
else:
    text = text.replace(old_map, new_map, 1)

# archive button hide in resetForm
if "if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';" not in text:
    text = text.replace(
        "if ($('btnArchiveShared')) $('btnArchiveShared').style.display = 'none';",
        "if ($('btnArchiveShared')) $('btnArchiveShared').style.display = 'none';\n    if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';",
        1,
    )

# reset defaults for qr_point after news block
RESET_QR = """
    if (currentType === 'qr_point') {
      if ($('qrTitle')) $('qrTitle').value = '';
      if ($('qrSlug')) { $('qrSlug').value = ''; delete $('qrSlug').dataset.manual; }
      if ($('qrSummary')) $('qrSummary').value = '';
      if ($('qrBody')) $('qrBody').value = '';
      if ($('qrEnabled')) $('qrEnabled').checked = true;
      if ($('qrStatus')) $('qrStatus').value = 'installed';
      if ($('qrCode')) $('qrCode').value = '';
      if ($('qrInstallLocation')) $('qrInstallLocation').value = '';
      if ($('qrInstalledAt')) $('qrInstalledAt').value = '';
      if ($('qrLastMaintenanceAt')) $('qrLastMaintenanceAt').value = '';
      if ($('qrDestKind')) $('qrDestKind').value = 'portal_local';
      if ($('qrDestSlug')) $('qrDestSlug').value = '';
      if ($('qrDestUrl')) $('qrDestUrl').value = '';
      if ($('qrLocation')) $('qrLocation').value = '';
      if ($('qrLat')) $('qrLat').value = '';
      if ($('qrLng')) $('qrLng').value = '';
      if ($('qrFeatured')) $('qrFeatured').checked = false;
      if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';
      if (typeof updateQrDestinationPreview === 'function') updateQrDestinationPreview();
    }
"""
if "if (currentType === 'qr_point')" not in text.split("function resetForm")[1][:8000]:
    marker = "    if (currentType === 'news') {"
    # insert reset block before clearSidebarActive after news block ends - safer: after news reset closing
    news_reset_end = """      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = 'none';
    }

    if (clearSidebarActive) {"""
    if news_reset_end not in text:
        raise SystemExit('news reset end not found')
    text = text.replace(
        news_reset_end,
        """      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = 'none';
    }
""" + RESET_QR + """
    if (clearSidebarActive) {""",
        1,
    )

# loadItemForEdit: insert before standard else
LOAD_QR = """
    } else if (item.type === 'qr_point') {
      const qr = item.qr || {};
      const meta = item.metadata || {};
      if ($('qrTitle')) $('qrTitle').value = item.title || '';
      if ($('qrSlug')) { $('qrSlug').value = item.slug || ''; $('qrSlug').dataset.manual = 'true'; }
      if ($('qrSummary')) $('qrSummary').value = item.summary || '';
      if ($('qrBody')) $('qrBody').value = item.body || '';
      if ($('qrEnabled')) $('qrEnabled').checked = qr.enabled === true;
      if ($('qrStatus')) $('qrStatus').value = qr.status || 'disabled';
      if ($('qrCode')) $('qrCode').value = qr.code || '';
      if ($('qrInstallLocation')) $('qrInstallLocation').value = qr.installationLocation || '';
      if ($('qrInstalledAt')) $('qrInstalledAt').value = qr.installedAt ? new Date(qr.installedAt).toISOString().slice(0, 10) : '';
      if ($('qrLastMaintenanceAt')) $('qrLastMaintenanceAt').value = qr.lastMaintenanceAt ? new Date(qr.lastMaintenanceAt).toISOString().slice(0, 10) : '';
      if ($('qrDestKind')) $('qrDestKind').value = meta.destinationKind || 'portal_local';
      if ($('qrDestSlug')) $('qrDestSlug').value = meta.destinationSlug || '';
      if ($('qrDestUrl')) $('qrDestUrl').value = meta.destinationUrl || '';
      if ($('qrLocation')) $('qrLocation').value = (typeof item.location === 'string' ? item.location : '') || '';
      if ($('qrLat')) $('qrLat').value = item.geo && item.geo.lat != null ? item.geo.lat : '';
      if ($('qrLng')) $('qrLng').value = item.geo && item.geo.lng != null ? item.geo.lng : '';
      if ($('qrFeatured')) $('qrFeatured').checked = item.featured === true;
      if ($('btnArchiveQr')) $('btnArchiveQr').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
      if (typeof updateQrDestinationPreview === 'function') updateQrDestinationPreview();
"""

old_else = """      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
    } else {
      // Standard / Default"""

if "item.type === 'qr_point'" not in text:
    if old_else not in text:
        raise SystemExit('loadItem else marker not found')
    text = text.replace(
        old_else,
        """      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
""" + LOAD_QR + """
    } else {
      // Standard / Default""",
        1,
    )

# buildPayload before Default / Standard
BUILD_QR = """
    if (currentType === 'qr_point') {
      const title = $('qrTitle').value.trim();
      if (!title) { showNotice('Informe o nome do ponto QR.', true); return null; }
      const slug = slugify($('qrSlug').value) || slugify(title);
      if (!slug) { showNotice('Informe o slug do ponto QR.', true); return null; }
      const enabled = $('qrEnabled').checked === true;
      const code = $('qrCode').value.trim();
      if (enabled && !code) { showNotice('Informe o código da placa QR para ativá-la.', true); return null; }
      const destKind = $('qrDestKind').value || 'portal_local';
      const destSlug = slugify($('qrDestSlug').value || '');
      const destUrl = ($('qrDestUrl').value || '').trim();
      if (destKind === 'external') {
        if (destUrl && !/^https?:\\/\\//i.test(destUrl)) {
          showNotice('URL externa deve começar com http:// ou https://', true);
          return null;
        }
      } else if (!destSlug) {
        // allow empty destination during draft
      }
      const latRaw = ($('qrLat').value || '').trim();
      const lngRaw = ($('qrLng').value || '').trim();
      let geo = { lat: null, lng: null };
      if (latRaw || lngRaw) {
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          showNotice('Coordenadas inválidas.', true);
          return null;
        }
        geo = { lat, lng };
      }
      const installedAt = $('qrInstalledAt').value || null;
      const lastMaintenanceAt = $('qrLastMaintenanceAt').value || null;
      let destinationUrl = '';
      if (destKind === 'external') destinationUrl = destUrl;
      else if (destKind === 'content' && destSlug) destinationUrl = `/turismo/conteudo/${destSlug}`;
      else if (destSlug) destinationUrl = `/turismo/local/${destSlug}`;
      return {
        type: 'qr_point',
        title,
        slug,
        summary: $('qrSummary').value.trim(),
        body: $('qrBody').value.trim(),
        location: $('qrLocation').value.trim(),
        featured: $('qrFeatured').checked === true,
        status: statusToSave || 'draft',
        geo,
        qr: {
          enabled,
          code,
          status: $('qrStatus').value || 'disabled',
          installationLocation: $('qrInstallLocation').value.trim(),
          installedAt,
          lastMaintenanceAt
        },
        metadata: {
          destinationKind: destKind,
          destinationSlug: destSlug,
          destinationUrl: destinationUrl || destUrl || '',
          qrCode: code
        }
      };
    }

"""

if "if (currentType === 'qr_point')" not in text.split("// Default / Standard")[0][-2000:]:
    marker = "    // Default / Standard\n    const name = $('stdTitle').value.trim();"
    if marker not in text:
        raise SystemExit('buildPayload standard marker not found')
    text = text.replace(marker, BUILD_QR + marker, 1)

# helper JS for destination preview - inject before loadItems or after buildPayload
HELPER_JS = """
  function updateQrDestinationPreview() {
    const kind = ($('qrDestKind') && $('qrDestKind').value) || 'portal_local';
    const slug = slugify(($('qrDestSlug') && $('qrDestSlug').value) || '');
    const external = (($('qrDestUrl') && $('qrDestUrl').value) || '').trim();
    const wrapSlug = $('qrDestSlugWrap');
    const wrapUrl = $('qrDestUrlWrap');
    if (wrapSlug) wrapSlug.style.display = kind === 'external' ? 'none' : '';
    if (wrapUrl) wrapUrl.style.display = kind === 'external' ? '' : 'none';
    let preview = '—';
    const origin = location.origin || '';
    if (kind === 'external') preview = external || '—';
    else if (kind === 'content' && slug) preview = origin + '/turismo/conteudo/' + slug;
    else if (slug) preview = origin + '/turismo/local/' + slug;
    if ($('qrDestPreview')) $('qrDestPreview').textContent = preview;
  }
  window.updateQrDestinationPreview = updateQrDestinationPreview;

"""

if "function updateQrDestinationPreview" not in text:
    text = text.replace("  // --- SAVE ACTION ---", HELPER_JS + "  // --- SAVE ACTION ---", 1)

# slug auto from title for qr fields - wire if there's a generic pattern; optional listeners near end
if "qrTitle').addEventListener" not in text and "$('qrTitle')" in text:
    # add near other slug listeners if exists
    pass

if text == orig:
    raise SystemExit('NO_CHANGES')
HTML.write_text(text, encoding="utf-8")
print("HTML_PATCHED", HTML.stat().st_size)
