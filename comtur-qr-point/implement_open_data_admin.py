#!/usr/bin/env python3
"""Implement specialized open_data form for COMTUR."""
from pathlib import Path
from datetime import datetime

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
UPLOAD = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-upload.js")
NAV = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")

# --- 1) Extend upload allowlist for structured open data ---
up = UPLOAD.read_text(encoding="utf-8")
bak = UPLOAD.with_name(f"comtur-upload.js.bak-opendata-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
bak.write_text(up, encoding="utf-8")

OLD_ALLOWED = """const allowed = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/x-icon', 'image/vnd.microsoft.icon', 'audio/mpeg', 'video/mp4',
])
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico', '.pdf', '.mp3', '.mp4'])"""

NEW_ALLOWED = """const allowed = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/x-icon', 'image/vnd.microsoft.icon', 'audio/mpeg', 'video/mp4',
  'text/csv', 'application/csv', 'text/plain', 'application/json', 'text/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
])
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico', '.pdf', '.mp3', '.mp4', '.csv', '.xlsx', '.json'])"""

if ".csv" not in up:
    if OLD_ALLOWED not in up:
        raise SystemExit("upload allowlist block not found")
    up = up.replace(OLD_ALLOWED, NEW_ALLOWED, 1)
    up = up.replace(
        "cb(new Error('Envie PDF, JPEG, PNG, WebP, MP3 ou MP4.'))",
        "cb(new Error('Envie PDF, JPEG, PNG, WebP, MP3, MP4, CSV, XLSX ou JSON.'))",
        1,
    )
    # magic checks for open data
    OLD_MAGIC_END = """  if (m.includes('icon')) return b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0
  return true
}"""
    NEW_MAGIC_END = """  if (m.includes('icon')) return b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (ext === '.xlsx' || m.includes('spreadsheetml')) return b[0] === 0x50 && b[1] === 0x4b
  if (ext === '.json' || m.includes('json')) {
    const head = fs.readFileSync(file.path).subarray(0, 64).toString('utf8').trimStart()
    return head.startsWith('{') || head.startsWith('[')
  }
  if (ext === '.csv' || m.includes('csv') || m === 'text/plain') return true
  return true
}"""
    if OLD_MAGIC_END not in up:
        raise SystemExit("magicOk end not found")
    up = up.replace(OLD_MAGIC_END, NEW_MAGIC_END, 1)
    UPLOAD.write_text(up, encoding="utf-8")
    print("UPLOAD_EXTENDED", bak.name)
else:
    print("UPLOAD_ALREADY")

# --- 2) Admin form ---
FORM = r'''
          <!-- ================================================================= -->
          <!-- OPEN DATA / DADOS ABERTOS FORM                                    -->
          <!-- ================================================================= -->
          <div id="openDataFields" class="comtur-category-fields" style="display:none">
            <div class="comtur-hint" style="background:#ecfdf5; border:1px solid #a7f3d0; padding:12px 16px; border-radius:8px; margin-bottom:16px; color:#065f46; font-weight:600; font-size:0.88rem;">
              Conjunto de dados públicos para consulta e download no portal. Não é publicação textual nem indicador automático.
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Identificação do conjunto</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="odName">Nome do conjunto de dados <span class="req">*</span></label>
                  <input id="odName" class="comtur-input" placeholder="Ex.: Atrativos turísticos de Garça">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odSlug">Slug / identificador na URL <span class="req">*</span></label>
                  <input id="odSlug" class="comtur-input" placeholder="atrativos-turisticos">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odDescription">Descrição do conjunto <span class="req">*</span></label>
                  <textarea id="odDescription" class="comtur-textarea" rows="3" placeholder="Descreva o conjunto de dados..."></textarea>
                </div>
                <div class="comtur-field">
                  <label for="odOrg">Órgão responsável <span class="req">*</span></label>
                  <input id="odOrg" class="comtur-input" placeholder="Ex.: Secretaria de Turismo">
                </div>
                <div class="comtur-field">
                  <label for="odCategory">Categoria temática</label>
                  <select id="odCategory" class="comtur-select">
                    <option value="Turismo">Turismo</option>
                    <option value="Atrativos turísticos" selected>Atrativos turísticos</option>
                    <option value="Hospedagem">Hospedagem</option>
                    <option value="Gastronomia">Gastronomia</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Serviços turísticos">Serviços turísticos</option>
                    <option value="Visitação">Visitação</option>
                    <option value="COMTUR">COMTUR</option>
                    <option value="Indicadores">Indicadores</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odSource">Fonte dos dados</label>
                  <input id="odSource" class="comtur-input" placeholder="Ex.: Cadastro Municipal de Turismo">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Atualização</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="odPeriodicity">Periodicidade de atualização <span class="req">*</span></label>
                  <select id="odPeriodicity" class="comtur-select">
                    <option value="Não definida">Não definida</option>
                    <option value="Diária">Diária</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal" selected>Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                    <option value="Sob demanda">Sob demanda</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="odLastUpdated">Data da última atualização</label>
                  <input id="odLastUpdated" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="odNextUpdate">Data da próxima atualização</label>
                  <input id="odNextUpdate" type="date" class="comtur-input">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Arquivo / recurso de dados</div>
              <p class="comtur-hint" style="margin-bottom:12px;">Envie o arquivo estruturado (CSV, XLSX ou JSON · máx. 25 MB).</p>
              <input id="odFileInput" type="file" accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none">
              <div id="odFileEmpty" style="border:2px dashed #cbd5e1; border-radius:var(--comtur-radius-md); padding:24px 16px; text-align:center; background:#f8fafc;">
                <div style="font-size:2.2rem; margin-bottom:8px;">📂</div>
                <div style="font-weight:700; color:var(--comtur-primary-dark); margin-bottom:4px;">Nenhum arquivo de dados anexado</div>
                <button type="button" class="comtur-btn comtur-btn-primary comtur-btn-sm" onclick="$('odFileInput').click()">Selecionar arquivo</button>
              </div>
              <div id="odFilePreview" style="display:none; border:1.5px solid #bbf7d0; border-radius:var(--comtur-radius-md); padding:16px; background:#f0fdf4;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                  <div style="min-width:0;">
                    <div id="odFileNameDisplay" style="font-weight:800; color:var(--comtur-primary-dark); word-break:break-all;">dados.csv</div>
                    <div style="font-size:0.82rem; color:var(--comtur-text-muted);">
                      Formato: <strong id="odFileFormatDisplay">CSV</strong> ·
                      Tamanho: <strong id="odFileSizeDisplay">—</strong> ·
                      Enviado: <strong id="odFileUploadedDisplay">—</strong>
                    </div>
                  </div>
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="if(odDataFile&&odDataFile.url) window.open(odDataFile.url,'_blank')">Baixar</button>
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('odFileInput').click()">Substituir</button>
                    <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="odDataFile=null; renderOpenDataFilePreview();">Remover</button>
                  </div>
                </div>
              </div>
              <div id="odFileProgress" class="comtur-hint" style="margin-top:8px; font-weight:600; color:var(--comtur-primary);"></div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Informações do recurso</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="odFormat">Formato do arquivo</label>
                  <input id="odFormat" class="comtur-input" placeholder="CSV / XLSX / JSON" readonly>
                </div>
                <div class="comtur-field">
                  <label for="odRecordCount">Número estimado de registros</label>
                  <input id="odRecordCount" type="number" min="0" class="comtur-input" placeholder="Ex.: 120">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odResourceDesc">Descrição do recurso</label>
                  <textarea id="odResourceDesc" class="comtur-textarea" rows="2" placeholder="Descrição do arquivo disponibilizado..."></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odColumns">Campos/colunas disponíveis</label>
                  <textarea id="odColumns" class="comtur-textarea" rows="2" placeholder="Ex.: nome, categoria, endereço, latitude, longitude"></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odMethodNotes">Observações metodológicas</label>
                  <textarea id="odMethodNotes" class="comtur-textarea" rows="2" placeholder="Critérios de coleta, cobertura, limitações..."></textarea>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">5</span> Fonte e transparência</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="odSourceRequired">Fonte dos dados <span class="req">*</span></label>
                  <input id="odSourceRequired" class="comtur-input" placeholder="Ex.: Cadastro Municipal de Turismo">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odMethodology">Metodologia / observações</label>
                  <textarea id="odMethodology" class="comtur-textarea" rows="3" placeholder="Como os dados foram produzidos..."></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odLicense">Licença / condições de uso</label>
                  <input id="odLicense" class="comtur-input" placeholder="Ex.: Uso público / CC BY 4.0">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="odUpdateNotes">Observações sobre atualização</label>
                  <textarea id="odUpdateNotes" class="comtur-textarea" rows="2" placeholder="Detalhes sobre a rotina de atualização..."></textarea>
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">6</span> Publicação</div>
              <div class="comtur-grid-2" style="margin-bottom:16px;">
                <div class="comtur-field">
                  <label for="odPublishDate">Data de publicação</label>
                  <input id="odPublishDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field" style="display:flex; align-items:flex-end;">
                  <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                    <input id="odFeatured" type="checkbox">
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
                  <button id="btnArchiveOd" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar</button>
                </div>
              </div>
            </div>
          </div>

'''

text = ADMIN.read_text(encoding="utf-8")
admin_bak = ADMIN.with_name(f"comtur-content-admin.html.bak-opendata-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
admin_bak.write_bytes(ADMIN.read_bytes())
print("ADMIN_BAK", admin_bak.name)

if 'id="openDataFields"' not in text:
    needle = "          <!-- 12. STANDARD / DOCUMENT FORM"
    if needle not in text:
        # try after research
        needle2 = 'id="researchFields"'
        if needle2 not in text:
            raise SystemExit("insert marker missing")
    text = text.replace(needle, FORM + needle, 1)
    print("FORM_INSERTED")
else:
    print("FORM_EXISTS")

# Fix category button label
if "newBtnLabel: '+ Novos dados'" in text:
    text = text.replace(
        "newBtnLabel: '+ Novos dados', formNewTitle: 'Novo conjunto de dados abertos'",
        "newBtnLabel: '+ Novo conjunto', formNewTitle: 'Novo conjunto de dados abertos'",
        1,
    )
    print("BTN_LABEL_FIXED")

# specializedMap
if "'open_data': 'openDataFields'" not in text:
    if "'research': 'researchFields'\n    };" in text:
        text = text.replace(
            "'research': 'researchFields'\n    };",
            "'research': 'researchFields',\n      'open_data': 'openDataFields'\n    };",
            1,
        )
    elif "'news': 'newsFields'\n    };" in text:
        text = text.replace(
            "'news': 'newsFields'\n    };",
            "'news': 'newsFields',\n      'open_data': 'openDataFields'\n    };",
            1,
        )
    else:
        raise SystemExit("specializedMap end not found")
    print("MAP_UPDATED")

# archive hide
if "btnArchiveOd" in text and "if ($('btnArchiveOd')) $('btnArchiveOd').style.display = 'none';" not in text:
    for anchor in [
        "if ($('btnArchiveRes')) $('btnArchiveRes').style.display = 'none';",
        "if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';",
    ]:
        if anchor in text:
            text = text.replace(
                anchor,
                anchor + "\n    if ($('btnArchiveOd')) $('btnArchiveOd').style.display = 'none';",
                1,
            )
            break

JS_HELPERS = r'''
  let odDataFile = null;

  function detectOpenDataFormat(name, mime) {
    const n = String(name || '').toLowerCase();
    const m = String(mime || '').toLowerCase();
    if (n.endsWith('.csv') || m.includes('csv')) return 'CSV';
    if (n.endsWith('.xlsx') || m.includes('spreadsheetml') || m.includes('excel')) return 'XLSX';
    if (n.endsWith('.json') || m.includes('json')) return 'JSON';
    return (n.split('.').pop() || 'ARQUIVO').toUpperCase();
  }

  function renderOpenDataFilePreview() {
    const emptyEl = $('odFileEmpty');
    const previewEl = $('odFilePreview');
    if (odDataFile && odDataFile.url) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'block';
      const fmt = odDataFile.format || detectOpenDataFormat(odDataFile.name || odDataFile.originalName, odDataFile.mimeType);
      if ($('odFileNameDisplay')) $('odFileNameDisplay').textContent = odDataFile.name || odDataFile.originalName || 'dados';
      if ($('odFileFormatDisplay')) $('odFileFormatDisplay').textContent = fmt;
      if ($('odFileSizeDisplay')) $('odFileSizeDisplay').textContent = odDataFile.sizeFormatted || (odDataFile.size ? formatBytes(odDataFile.size) : '—');
      if ($('odFileUploadedDisplay')) $('odFileUploadedDisplay').textContent = odDataFile.uploadedAt
        ? new Date(odDataFile.uploadedAt).toLocaleString('pt-BR')
        : '—';
      if ($('odFormat')) $('odFormat').value = fmt;
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
      if (previewEl) previewEl.style.display = 'none';
      if ($('odFormat')) $('odFormat').value = '';
    }
  }

  async function uploadOpenDataFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const okExt = name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.json');
    const okMime = ['text/csv','application/csv','application/json','text/json','text/plain','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/octet-stream'].includes(file.type);
    if (!okExt && !okMime) { showNotice('Envie apenas CSV, XLSX ou JSON.', true); return; }
    if (file.size > 25 * 1024 * 1024) { showNotice('Arquivo acima de 25 MB.', true); return; }
    const progressEl = $('odFileProgress');
    if (progressEl) progressEl.textContent = 'Enviando arquivo de dados...';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const send = (window.SemitSession && typeof SemitSession.fetchAuth === 'function') ? SemitSession.fetchAuth.bind(SemitSession) : fetch;
      const res = await send('/api/comtur/admin/media/upload', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => ({}));
      const data = payload.data || payload;
      if (res.ok && data.url) {
        const fmt = detectOpenDataFormat(file.name, data.mimeType || file.type);
        odDataFile = {
          url: data.url,
          name: file.name,
          originalName: file.name,
          size: data.sizeBytes || file.size,
          sizeFormatted: formatBytes(data.sizeBytes || file.size),
          mimeType: data.mimeType || file.type,
          format: fmt,
          uploadedAt: new Date().toISOString()
        };
        renderOpenDataFilePreview();
        if (progressEl) progressEl.textContent = 'Arquivo anexado com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 2500);
      } else {
        showNotice((payload && (payload.error || payload.message)) || 'Falha no upload do arquivo.', true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (e) {
      showNotice('Erro de rede ao enviar arquivo.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

'''

if "let odDataFile = null;" not in text:
    text = text.replace("  // --- SAVE ACTION ---", JS_HELPERS + "\n  // --- SAVE ACTION ---", 1)
    print("JS_HELPERS_INSERTED")

if "odFileInput').addEventListener" not in text:
    listeners = r'''
  if ($('odFileInput')) {
    $('odFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) uploadOpenDataFile(e.target.files[0]);
      e.target.value = '';
    });
  }
  if ($('odName') && $('odSlug')) {
    $('odName').addEventListener('input', function () {
      if ($('odSlug').dataset.manual === 'true') return;
      $('odSlug').value = slugify($('odName').value);
    });
    $('odSlug').addEventListener('input', function () {
      $('odSlug').dataset.manual = 'true';
    });
  }
  // sync source fields
  if ($('odSource') && $('odSourceRequired')) {
    $('odSource').addEventListener('input', function () {
      if (!$('odSourceRequired').dataset.manual) $('odSourceRequired').value = this.value;
    });
    $('odSourceRequired').addEventListener('input', function () {
      this.dataset.manual = 'true';
      $('odSource').value = this.value;
    });
  }
'''
    # insert after research listeners or news export
    if "window.uploadNewsCover = uploadNewsCover;" in text:
        text = text.replace(
            "window.uploadNewsCover = uploadNewsCover;",
            "window.uploadNewsCover = uploadNewsCover;\n" + listeners,
            1,
        )
    elif "let resPdfFile = null;" in text:
        text = text.replace("let resPdfFile = null;", listeners + "\n  let resPdfFile = null;", 1)
    else:
        text = text.replace("  // --- SAVE ACTION ---", listeners + "\n  // --- SAVE ACTION ---", 1)
    print("LISTENERS_INSERTED")

RESET = r'''
    if (currentType === 'open_data') {
      if ($('odName')) { $('odName').value = ''; }
      if ($('odSlug')) { $('odSlug').value = ''; delete $('odSlug').dataset.manual; }
      if ($('odDescription')) $('odDescription').value = '';
      if ($('odOrg')) $('odOrg').value = '';
      if ($('odCategory')) $('odCategory').value = 'Atrativos turísticos';
      if ($('odSource')) $('odSource').value = '';
      if ($('odSourceRequired')) { $('odSourceRequired').value = ''; delete $('odSourceRequired').dataset.manual; }
      if ($('odPeriodicity')) $('odPeriodicity').value = 'Mensal';
      if ($('odLastUpdated')) $('odLastUpdated').value = new Date().toISOString().slice(0,10);
      if ($('odNextUpdate')) $('odNextUpdate').value = '';
      if ($('odFormat')) $('odFormat').value = '';
      if ($('odResourceDesc')) $('odResourceDesc').value = '';
      if ($('odRecordCount')) $('odRecordCount').value = '';
      if ($('odColumns')) $('odColumns').value = '';
      if ($('odMethodNotes')) $('odMethodNotes').value = '';
      if ($('odMethodology')) $('odMethodology').value = '';
      if ($('odLicense')) $('odLicense').value = '';
      if ($('odUpdateNotes')) $('odUpdateNotes').value = '';
      if ($('odPublishDate')) $('odPublishDate').value = new Date().toISOString().slice(0,10);
      if ($('odFeatured')) $('odFeatured').checked = false;
      odDataFile = null;
      renderOpenDataFilePreview();
      if ($('btnArchiveOd')) $('btnArchiveOd').style.display = 'none';
    }
'''

if "if (currentType === 'open_data')" not in text.split("function resetForm")[1][:15000]:
    if "if (currentType === 'research')" in text:
        text = text.replace("    if (currentType === 'research') {", RESET + "\n    if (currentType === 'research') {", 1)
    elif "if (currentType === 'qr_point')" in text:
        text = text.replace("    if (currentType === 'qr_point') {", RESET + "\n    if (currentType === 'qr_point') {", 1)
    else:
        text = text.replace("    if (clearSidebarActive) {", RESET + "\n    if (clearSidebarActive) {", 1)
    print("RESET_INSERTED")

LOAD = r'''
    } else if (item.type === 'open_data') {
      const meta = item.metadata || {};
      if ($('odName')) $('odName').value = item.title || '';
      if ($('odSlug')) { $('odSlug').value = item.slug || ''; $('odSlug').dataset.manual = 'true'; }
      if ($('odDescription')) $('odDescription').value = meta.description || item.summary || '';
      if ($('odOrg')) $('odOrg').value = meta.responsibleBody || item.location || '';
      if ($('odCategory')) $('odCategory').value = meta.category || 'Atrativos turísticos';
      const src = meta.source || meta.dataSource || '';
      if ($('odSource')) $('odSource').value = src;
      if ($('odSourceRequired')) { $('odSourceRequired').value = src; $('odSourceRequired').dataset.manual = 'true'; }
      if ($('odPeriodicity')) $('odPeriodicity').value = meta.periodicity || 'Mensal';
      if ($('odLastUpdated')) $('odLastUpdated').value = meta.lastUpdated ? String(meta.lastUpdated).slice(0,10) : '';
      if ($('odNextUpdate')) $('odNextUpdate').value = meta.nextUpdate ? String(meta.nextUpdate).slice(0,10) : '';
      if ($('odFormat')) $('odFormat').value = meta.format || '';
      if ($('odResourceDesc')) $('odResourceDesc').value = meta.resourceDescription || '';
      if ($('odRecordCount')) $('odRecordCount').value = meta.recordCount != null ? meta.recordCount : '';
      if ($('odColumns')) $('odColumns').value = meta.columns || '';
      if ($('odMethodNotes')) $('odMethodNotes').value = meta.methodNotes || '';
      if ($('odMethodology')) $('odMethodology').value = meta.methodology || item.body || '';
      if ($('odLicense')) $('odLicense').value = meta.license || '';
      if ($('odUpdateNotes')) $('odUpdateNotes').value = meta.updateNotes || '';
      if ($('odPublishDate')) $('odPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0,10) : '';
      if ($('odFeatured')) $('odFeatured').checked = item.featured === true;
      const docMedia = (item.media || []).find(m => m.kind === 'document' || (m.url && /\.(csv|xlsx|json)$/i.test(m.url)));
      if (meta.dataFile && meta.dataFile.url) odDataFile = meta.dataFile;
      else if (docMedia && docMedia.url) {
        odDataFile = {
          url: docMedia.url,
          name: docMedia.originalName || docMedia.title || 'dados',
          originalName: docMedia.originalName || docMedia.title || 'dados',
          size: docMedia.size || 0,
          sizeFormatted: docMedia.size ? formatBytes(docMedia.size) : '—',
          mimeType: docMedia.mimeType || '',
          format: meta.format || detectOpenDataFormat(docMedia.originalName || docMedia.url, docMedia.mimeType),
          uploadedAt: meta.fileUploadedAt || item.updatedAt || null
        };
      } else odDataFile = null;
      renderOpenDataFilePreview();
      if ($('btnArchiveOd')) $('btnArchiveOd').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
'''

if "item.type === 'open_data'" not in text:
    if "item.type === 'research'" in text:
        text = text.replace("    } else if (item.type === 'research') {", LOAD + "\n    } else if (item.type === 'research') {", 1)
    elif "item.type === 'qr_point'" in text:
        text = text.replace("    } else if (item.type === 'qr_point') {", LOAD + "\n    } else if (item.type === 'qr_point') {", 1)
    else:
        text = text.replace(
            "      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';\n    } else {",
            "      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';\n" + LOAD + "\n    } else {",
            1,
        )
    print("LOAD_INSERTED")

BUILD = r'''
    if (currentType === 'open_data') {
      const title = $('odName').value.trim();
      if (!title) { showNotice('Informe o nome do conjunto de dados.', true); return null; }
      const slug = slugify($('odSlug').value) || slugify(title);
      if (!slug) { showNotice('Informe o slug do conjunto.', true); return null; }
      const description = $('odDescription').value.trim();
      if (!description) { showNotice('Informe a descrição do conjunto.', true); return null; }
      const org = $('odOrg').value.trim();
      if (!org) { showNotice('Informe o órgão responsável.', true); return null; }
      const periodicity = $('odPeriodicity').value;
      if (!periodicity) { showNotice('Selecione a periodicidade.', true); return null; }
      const source = ($('odSourceRequired').value.trim() || $('odSource').value.trim());
      if (!source) { showNotice('Informe a fonte dos dados.', true); return null; }
      if ((statusToSave === 'published' || statusToSave === 'review') && !(odDataFile && odDataFile.url)) {
        showNotice('Anexe o arquivo de dados (CSV, XLSX ou JSON) antes de publicar/enviar para revisão.', true); return null;
      }
      const recordsRaw = ($('odRecordCount').value || '').trim();
      let recordCount = null;
      if (recordsRaw !== '') {
        recordCount = Number(recordsRaw);
        if (!Number.isFinite(recordCount) || recordCount < 0) {
          showNotice('Número de registros inválido.', true); return null;
        }
      }
      const format = (odDataFile && odDataFile.format) || ($('odFormat').value || '').trim() || detectOpenDataFormat(odDataFile && (odDataFile.name || odDataFile.url), odDataFile && odDataFile.mimeType);
      const pubDateVal = $('odPublishDate').value;
      const publishedAt = pubDateVal ? new Date(pubDateVal).toISOString() : (statusToSave === 'published' ? new Date().toISOString() : undefined);
      const media = [];
      if (odDataFile && odDataFile.url) {
        media.push({
          kind: 'document',
          title: title,
          url: odDataFile.url,
          mimeType: odDataFile.mimeType || 'application/octet-stream',
          size: odDataFile.size,
          originalName: odDataFile.originalName || odDataFile.name,
          isAccessible: true
        });
      }
      return {
        type: 'open_data',
        title,
        slug,
        summary: description,
        body: $('odMethodology').value.trim(),
        location: org,
        featured: $('odFeatured').checked === true,
        publishedAt,
        status: statusToSave || 'draft',
        media,
        metadata: {
          description,
          responsibleBody: org,
          category: $('odCategory').value,
          source,
          dataSource: source,
          periodicity,
          lastUpdated: $('odLastUpdated').value || null,
          nextUpdate: $('odNextUpdate').value || null,
          format,
          resourceDescription: $('odResourceDesc').value.trim(),
          recordCount,
          columns: $('odColumns').value.trim(),
          methodNotes: $('odMethodNotes').value.trim(),
          methodology: $('odMethodology').value.trim(),
          license: $('odLicense').value.trim(),
          updateNotes: $('odUpdateNotes').value.trim(),
          dataFile: odDataFile,
          fileUploadedAt: odDataFile && odDataFile.uploadedAt ? odDataFile.uploadedAt : null,
          showOnPortal: true
        }
      };
    }

'''

if "if (currentType === 'open_data')" not in text.split("// Default / Standard")[0][-5000:]:
    text = text.replace(
        "    // Default / Standard\n    const name = $('stdTitle').value.trim();",
        BUILD + "    // Default / Standard\n    const name = $('stdTitle').value.trim();",
        1,
    )
    print("BUILD_INSERTED")

# empty list
if "Nenhum conjunto de dados cadastrado" not in text and "Nenhum conjunto cadastrado" not in text:
    # try after research empty or news
    if "currentType === 'research'" in text and "Nenhuma pesquisa cadastrada" in text:
        text = text.replace(
            """      } else if (currentType === 'research') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma pesquisa encontrada.' : 'Nenhuma pesquisa cadastrada.'}</div>`;
      }""",
            """      } else if (currentType === 'research') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma pesquisa encontrada.' : 'Nenhuma pesquisa cadastrada.'}</div>`;
      } else if (currentType === 'open_data') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhum conjunto encontrado.' : 'Nenhum conjunto de dados cadastrado.'}</div>`;
      }""",
            1,
        )
        print("EMPTY_MSG")
    elif "currentType === 'news'" in text:
        text = text.replace(
            """      } else if (currentType === 'news') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>`;
      }""",
            """      } else if (currentType === 'news') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>`;
      } else if (currentType === 'open_data') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhum conjunto encontrado.' : 'Nenhum conjunto de dados cadastrado.'}</div>`;
      }""",
            1,
        )
        print("EMPTY_MSG_NEWS")

# list card
if "item.type === 'open_data'" not in text.split("function renderList")[1][:30000]:
    card = r'''
      if (item.type === 'open_data') {
        const meta = item.metadata || {};
        const updated = meta.lastUpdated || item.updatedAt || item.publishedAt;
        const updatedLabel = updated
          ? `Atualizado em ${new Date(updated).toLocaleDateString('pt-BR')}`
          : 'Atualização não informada';
        const fmt = meta.format || (meta.dataFile && meta.dataFile.format) || '';
        return `
          <button class="comtur-list-item ${isActive ? 'is-active' : ''}" type="button" data-id="${item._id}" style="padding:10px 12px; width:100%; text-align:left;">
            <div class="comtur-list-title" style="font-weight:700; font-size:0.92rem; margin-bottom:4px;">${escapeHtml(item.title || 'Sem título')}</div>
            <div style="font-size:0.78rem; color:var(--comtur-text-muted); margin-bottom:6px;">${escapeHtml(updatedLabel)}${fmt ? ' · ' + escapeHtml(fmt) : ''}</div>
            <div class="comtur-list-meta" style="display:flex; justify-content:space-between; align-items:center;">
              <span class="comtur-badge ${statusClass}">${statusLabel}</span>
              <span style="font-size:0.72rem; color:#64748b;">${escapeHtml(meta.category || '')}</span>
            </div>
          </button>
        `;
      }

'''
    if "if (item.type === 'research')" in text:
        text = text.replace("      if (item.type === 'research') {", card + "      if (item.type === 'research') {", 1)
        print("LIST_CARD")
    elif "if (item.type === 'legislation')" in text:
        text = text.replace("      if (item.type === 'legislation') {", card + "      if (item.type === 'legislation') {", 1)
        print("LIST_CARD_LEG")
    elif "// 7. Default Standard Card" in text:
        text = text.replace("// 7. Default Standard Card", card + "      // 7. Default Standard Card", 1)
        print("LIST_CARD_DEFAULT")

ADMIN.write_text(text, encoding="utf-8")
print("ADMIN_SIZE", ADMIN.stat().st_size)

# bump nav cache
nt = NAV.read_text(encoding="utf-8")
nt2 = nt.replace("comtur-content-admin.html?v=17", "comtur-content-admin.html?v=18").replace("comtur-content-admin.html?v=16", "comtur-content-admin.html?v=18")
if nt2 != nt:
    NAV.write_text(nt2, encoding="utf-8")
    print("NAV_v18")

print("DONE_ADMIN")
