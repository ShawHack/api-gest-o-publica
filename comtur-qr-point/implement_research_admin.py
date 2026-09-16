#!/usr/bin/env python3
"""Implement specialized research form + public pages for COMTUR."""
from pathlib import Path
from datetime import datetime
import re

ADMIN = Path("/home/semit/Documentos/api-semit/backend/public/comtur-content-admin.html")
HELPER = Path("/home/semit/Documentos/api-semit/backend/helpers/comtur-content.js")
NGINX = Path("/home/semit/Documentos/api-semit/nginx/nginx.conf")
PESQ_DIR = Path("/home/semit/Documentos/api-semit/backend/public/turismo/pesquisas")

FORM = r'''
          <!-- ================================================================= -->
          <!-- RESEARCH / PESQUISA FORM                                          -->
          <!-- ================================================================= -->
          <div id="researchFields" class="comtur-category-fields" style="display:none">
            <div class="comtur-hint" style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px 16px; border-radius:8px; margin-bottom:16px; color:#1e3a8a; font-weight:600; font-size:0.88rem;">
              Pesquisa publicável no portal — cadastro editorial com relatório PDF e resultados destacados. Não coleta respostas online.
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Identificação da Pesquisa</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="resTitle">Título da pesquisa <span class="req">*</span></label>
                  <input id="resTitle" class="comtur-input" placeholder="Ex.: Pesquisa de Satisfação do Turista – Garça 2026">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="resSlug">Slug (URL pública) <span class="req">*</span></label>
                  <input id="resSlug" class="comtur-input" placeholder="pesquisa-de-satisfacao-do-turista-garca-2026">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="resObjective">Objetivo da pesquisa <span class="req">*</span></label>
                  <textarea id="resObjective" class="comtur-textarea" rows="3" placeholder="Descreva o objetivo da pesquisa..."></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="resResponsible">Órgão responsável</label>
                  <input id="resResponsible" class="comtur-input" placeholder="Ex.: Secretaria de Turismo / COMTUR">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Período e Abrangência</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="resStartDate">Data inicial <span class="req">*</span></label>
                  <input id="resStartDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="resEndDate">Data final <span class="req">*</span></label>
                  <input id="resEndDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="resAudience">Público pesquisado <span class="req">*</span></label>
                  <select id="resAudience" class="comtur-select">
                    <option value="Turistas" selected>Turistas</option>
                    <option value="Visitantes">Visitantes</option>
                    <option value="Moradores">Moradores</option>
                    <option value="Empresários do setor turístico">Empresários do setor turístico</option>
                    <option value="Participantes de eventos">Participantes de eventos</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="resParticipants">Número de participantes / respondentes</label>
                  <input id="resParticipants" type="number" min="0" class="comtur-input" placeholder="Ex.: 500">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="resCoverage">Local / Abrangência</label>
                  <input id="resCoverage" class="comtur-input" placeholder="Ex.: Município de Garça">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Metodologia</div>
              <div class="comtur-field">
                <label for="resMethodology">Metodologia da pesquisa <span class="req">*</span></label>
                <textarea id="resMethodology" class="comtur-textarea" rows="5" placeholder="Como os dados foram coletados, período, público, quantidade, critérios e análise..."></textarea>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Resultados</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="resSummaryResults">Resumo dos resultados <span class="req">*</span></label>
                  <textarea id="resSummaryResults" class="comtur-textarea" rows="4" placeholder="Resumo dos principais achados..."></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="resConclusions">Principais conclusões</label>
                  <textarea id="resConclusions" class="comtur-textarea" rows="4" placeholder="Conclusões da pesquisa..."></textarea>
                </div>
              </div>
              <div style="margin-top: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <strong style="color:var(--comtur-primary-dark);">Resultados destacados</strong>
                  <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="addResearchResultRow()">+ Adicionar resultado</button>
                </div>
                <div id="resHighlightedResults"></div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">5</span> Relatório / Documentos</div>
              <p class="comtur-hint" style="margin-bottom:12px;">Envie o relatório completo em PDF (máx. 20 MB).</p>
              <input id="resPdfFileInput" type="file" accept=".pdf,application/pdf" style="display:none">
              <div id="resPdfEmpty" style="border:2px dashed #cbd5e1; border-radius:var(--comtur-radius-md); padding:24px 16px; text-align:center; background:#f8fafc;">
                <div style="font-size:2.2rem; margin-bottom:8px;">📄</div>
                <div style="font-weight:700; color:var(--comtur-primary-dark); margin-bottom:4px;">Nenhum relatório PDF anexado</div>
                <button type="button" class="comtur-btn comtur-btn-primary comtur-btn-sm" onclick="$('resPdfFileInput').click()">Selecionar PDF</button>
              </div>
              <div id="resPdfPreview" style="display:none; border:1.5px solid #bbf7d0; border-radius:var(--comtur-radius-md); padding:16px; background:#f0fdf4;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                  <div style="min-width:0;">
                    <div id="resPdfFileNameDisplay" style="font-weight:800; color:var(--comtur-primary-dark); word-break:break-all;">relatorio.pdf</div>
                    <div style="font-size:0.82rem; color:var(--comtur-text-muted);">Tamanho: <strong id="resPdfSizeDisplay">PDF</strong></div>
                  </div>
                  <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="if(resPdfFile&&resPdfFile.url) window.open(resPdfFile.url,'_blank')">Visualizar</button>
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('resPdfFileInput').click()">Substituir</button>
                    <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="resPdfFile=null; renderResearchPdfPreview();">Remover</button>
                  </div>
                </div>
              </div>
              <div id="resPdfProgress" class="comtur-hint" style="margin-top:8px; font-weight:600; color:var(--comtur-primary);"></div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">6</span> Imagem de capa</div>
              <div id="resCoverEmpty" class="comtur-upload-zone" onclick="$('resCoverFileInput').click()" style="cursor:pointer;">
                <input id="resCoverFileInput" type="file" accept="image/jpeg,image/png,image/webp" style="display:none">
                <div style="font-size:2.2rem; margin-bottom:6px;">📷</div>
                <div style="font-weight:700; color:var(--comtur-primary-dark);">Clique para selecionar a imagem de capa</div>
                <div class="comtur-hint" style="margin-top:8px;">JPG, PNG ou WEBP · máx. 10 MB</div>
              </div>
              <div id="resCoverPreview" style="display:none; background:#f8fafc; border:1.5px solid var(--comtur-primary); border-radius:var(--comtur-radius-lg); padding:18px;">
                <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; justify-content:space-between;">
                  <div style="display:flex; gap:16px; align-items:center;">
                    <div style="width:110px; height:75px; border-radius:var(--comtur-radius-md); overflow:hidden; background:#e2e8f0;">
                      <img id="resCoverImgDisplay" src="" alt="Capa" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div>
                      <div id="resCoverFileNameDisplay" style="font-weight:800; color:var(--comtur-primary-dark);"></div>
                      <div style="font-size:0.82rem; color:var(--comtur-text-muted);">Tamanho: <strong id="resCoverSizeDisplay"></strong></div>
                    </div>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('resCoverFileInput').click()">Trocar</button>
                    <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="resCoverFile=null; renderResearchCoverPreview();">Remover</button>
                  </div>
                </div>
              </div>
              <div id="resCoverProgress" class="comtur-hint" style="margin-top:8px; font-weight:600;"></div>
              <div class="comtur-grid-3" style="margin-top:16px;">
                <div class="comtur-field">
                  <label for="resPhotoCredit">Crédito</label>
                  <input id="resPhotoCredit" class="comtur-input" placeholder="Crédito da foto">
                </div>
                <div class="comtur-field">
                  <label for="resPhotoCaption">Legenda</label>
                  <input id="resPhotoCaption" class="comtur-input" placeholder="Legenda">
                </div>
                <div class="comtur-field">
                  <label for="resPhotoAlt">Texto alternativo</label>
                  <input id="resPhotoAlt" class="comtur-input" placeholder="Descrição acessível">
                </div>
              </div>
            </div>

            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">7</span> Publicação</div>
              <div class="comtur-grid-2" style="margin-bottom:16px;">
                <div class="comtur-field">
                  <label for="resPublishDate">Data de publicação</label>
                  <input id="resPublishDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field" style="display:flex; align-items:flex-end;">
                  <label style="display:flex; align-items:center; gap:8px; font-weight:600; cursor:pointer;">
                    <input id="resFeatured" type="checkbox">
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
                  <button id="btnArchiveRes" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar</button>
                </div>
              </div>
            </div>
          </div>

'''

text = ADMIN.read_text(encoding="utf-8")
if 'id="researchFields"' not in text:
    needle = "          <!-- 12. STANDARD / DOCUMENT FORM"
    if needle not in text:
        raise SystemExit("standard form marker missing")
    text = text.replace(needle, FORM + needle, 1)
    print("FORM_INSERTED")
else:
    print("FORM_EXISTS")

# specializedMap
if "'research': 'researchFields'" not in text:
    text = text.replace(
        "'news': 'newsFields'\n    };",
        "'news': 'newsFields',\n      'research': 'researchFields'\n    };",
        1,
    )
    print("MAP_UPDATED")

# archive button hide
if "btnArchiveRes" in text and "if ($('btnArchiveRes')) $('btnArchiveRes').style.display = 'none';" not in text:
    text = text.replace(
        "if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';",
        "if ($('btnArchiveQr')) $('btnArchiveQr').style.display = 'none';\n    if ($('btnArchiveRes')) $('btnArchiveRes').style.display = 'none';",
        1,
    )

# JS helpers + state — inject before SAVE ACTION
JS_HELPERS = r'''
  let resPdfFile = null;
  let resCoverFile = null;
  let resHighlightedResults = [];

  function renderResearchPdfPreview() {
    const emptyEl = $('resPdfEmpty');
    const previewEl = $('resPdfPreview');
    if (resPdfFile && resPdfFile.url) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'block';
      if ($('resPdfFileNameDisplay')) $('resPdfFileNameDisplay').textContent = resPdfFile.name || resPdfFile.originalName || 'relatorio.pdf';
      if ($('resPdfSizeDisplay')) $('resPdfSizeDisplay').textContent = resPdfFile.sizeFormatted || (resPdfFile.size ? ('PDF | ' + formatBytes(resPdfFile.size)) : 'PDF');
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
      if (previewEl) previewEl.style.display = 'none';
    }
  }

  function renderResearchCoverPreview() {
    const emptyEl = $('resCoverEmpty');
    const previewEl = $('resCoverPreview');
    if (resCoverFile && resCoverFile.url) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'block';
      if ($('resCoverImgDisplay')) $('resCoverImgDisplay').src = resCoverFile.url;
      if ($('resCoverFileNameDisplay')) $('resCoverFileNameDisplay').textContent = resCoverFile.name || resCoverFile.originalName || 'capa.jpg';
      if ($('resCoverSizeDisplay')) $('resCoverSizeDisplay').textContent = resCoverFile.sizeFormatted || (resCoverFile.size ? formatBytes(resCoverFile.size) : 'Imagem');
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
      if (previewEl) previewEl.style.display = 'none';
      if ($('resCoverImgDisplay')) $('resCoverImgDisplay').src = '';
    }
  }

  function renderResearchHighlightedResults() {
    const box = $('resHighlightedResults');
    if (!box) return;
    if (!resHighlightedResults.length) {
      box.innerHTML = '<div class="comtur-hint">Nenhum resultado destacado. Clique em “Adicionar resultado”.</div>';
      return;
    }
    box.innerHTML = resHighlightedResults.map((row, idx) => `
      <div class="comtur-grid-2" style="border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-bottom:8px; background:#fff;">
        <div class="comtur-field">
          <label>Indicador</label>
          <input class="comtur-input" value="${escapeHtml(row.indicator || '')}" oninput="resHighlightedResults[${idx}].indicator=this.value">
        </div>
        <div class="comtur-field">
          <label>Valor</label>
          <input class="comtur-input" type="number" step="any" value="${row.value ?? ''}" oninput="resHighlightedResults[${idx}].value=this.value === '' ? '' : Number(this.value)">
        </div>
        <div class="comtur-field">
          <label>Unidade</label>
          <input class="comtur-input" value="${escapeHtml(row.unit || '%')}" oninput="resHighlightedResults[${idx}].unit=this.value">
        </div>
        <div class="comtur-field" style="display:flex; align-items:flex-end;">
          <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="resHighlightedResults.splice(${idx},1); renderResearchHighlightedResults();">Remover</button>
        </div>
      </div>
    `).join('');
  }

  function addResearchResultRow() {
    resHighlightedResults.push({ indicator: '', value: '', unit: '%' });
    renderResearchHighlightedResults();
  }
  window.addResearchResultRow = addResearchResultRow;

  async function uploadResearchPdf(file) {
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) { showNotice('Envie apenas PDF (.pdf).', true); return; }
    if (file.size > 20 * 1024 * 1024) { showNotice('PDF acima de 20 MB.', true); return; }
    const progressEl = $('resPdfProgress');
    if (progressEl) progressEl.textContent = 'Enviando relatório PDF...';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const send = (window.SemitSession && typeof SemitSession.fetchAuth === 'function') ? SemitSession.fetchAuth.bind(SemitSession) : fetch;
      const res = await send('/api/comtur/admin/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        resPdfFile = { url: data.url, name: file.name, originalName: file.name, size: file.size, sizeFormatted: 'PDF | ' + formatBytes(file.size), mimeType: 'application/pdf' };
        renderResearchPdfPreview();
        if (progressEl) progressEl.textContent = 'PDF anexado com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 2500);
      } else {
        showNotice((data && data.error) || 'Falha no upload do PDF.', true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (e) {
      showNotice('Erro de rede ao enviar PDF.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

  async function uploadResearchCover(file) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { showNotice('Use JPG, PNG ou WEBP.', true); return; }
    if (file.size > 10 * 1024 * 1024) { showNotice('Imagem acima de 10 MB.', true); return; }
    const progressEl = $('resCoverProgress');
    if (progressEl) progressEl.textContent = 'Enviando imagem de capa...';
    const formData = new FormData();
    formData.append('file', file);
    try {
      const send = (window.SemitSession && typeof SemitSession.fetchAuth === 'function') ? SemitSession.fetchAuth.bind(SemitSession) : fetch;
      const res = await send('/api/comtur/admin/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        resCoverFile = { url: data.url, name: file.name, originalName: file.name, size: file.size, sizeFormatted: formatBytes(file.size), mimeType: file.type };
        renderResearchCoverPreview();
        if (progressEl) progressEl.textContent = 'Capa enviada!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 2500);
      } else {
        showNotice((data && data.error) || 'Falha no upload da capa.', true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (e) {
      showNotice('Erro de rede ao enviar capa.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

'''

if "let resPdfFile = null;" not in text:
    text = text.replace("  // --- SAVE ACTION ---", JS_HELPERS + "\n  // --- SAVE ACTION ---", 1)
    print("JS_HELPERS_INSERTED")

# Event listeners near news cover listeners — append after uploadNewsCover window export
if "resPdfFileInput" in text and "resPdfFileInput').addEventListener" not in text:
    listeners = r'''
  if ($('resPdfFileInput')) {
    $('resPdfFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) uploadResearchPdf(e.target.files[0]);
      e.target.value = '';
    });
  }
  if ($('resCoverFileInput')) {
    $('resCoverFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) uploadResearchCover(e.target.files[0]);
      e.target.value = '';
    });
  }
  if ($('resTitle') && $('resSlug')) {
    $('resTitle').addEventListener('input', function () {
      if ($('resSlug').dataset.manual === 'true') return;
      $('resSlug').value = slugify($('resTitle').value);
    });
    $('resSlug').addEventListener('input', function () {
      $('resSlug').dataset.manual = 'true';
    });
  }
'''
    text = text.replace(
        "  window.uploadNewsCover = uploadNewsCover;",
        "  window.uploadNewsCover = uploadNewsCover;\n" + listeners,
        1,
    )
    print("LISTENERS_INSERTED")

# resetForm research block
RESET = r'''
    if (currentType === 'research') {
      if ($('resTitle')) { $('resTitle').value = ''; delete $('resTitle').dataset.manual; }
      if ($('resSlug')) { $('resSlug').value = ''; delete $('resSlug').dataset.manual; }
      if ($('resObjective')) $('resObjective').value = '';
      if ($('resResponsible')) $('resResponsible').value = '';
      if ($('resStartDate')) $('resStartDate').value = '';
      if ($('resEndDate')) $('resEndDate').value = '';
      if ($('resAudience')) $('resAudience').value = 'Turistas';
      if ($('resParticipants')) $('resParticipants').value = '';
      if ($('resCoverage')) $('resCoverage').value = '';
      if ($('resMethodology')) $('resMethodology').value = '';
      if ($('resSummaryResults')) $('resSummaryResults').value = '';
      if ($('resConclusions')) $('resConclusions').value = '';
      if ($('resPhotoCredit')) $('resPhotoCredit').value = '';
      if ($('resPhotoCaption')) $('resPhotoCaption').value = '';
      if ($('resPhotoAlt')) $('resPhotoAlt').value = '';
      if ($('resPublishDate')) $('resPublishDate').value = new Date().toISOString().slice(0, 10);
      if ($('resFeatured')) $('resFeatured').checked = false;
      resPdfFile = null; resCoverFile = null; resHighlightedResults = [];
      renderResearchPdfPreview(); renderResearchCoverPreview(); renderResearchHighlightedResults();
      if ($('btnArchiveRes')) $('btnArchiveRes').style.display = 'none';
    }
'''

if "if (currentType === 'research')" not in text.split("function resetForm")[1][:12000]:
    marker = """    if (currentType === 'news') {
      if ($('newsTitle')) {"""
    # insert before news reset by appending after news reset end already used for qr - insert before clearSidebarActive after qr block if present
    if "if (currentType === 'qr_point')" in text:
        text = text.replace(
            "    if (currentType === 'qr_point') {",
            RESET + "\n    if (currentType === 'qr_point') {",
            1,
        )
    else:
        text = text.replace(
            "    if (clearSidebarActive) {",
            RESET + "\n    if (clearSidebarActive) {",
            1,
        )
    print("RESET_INSERTED")

# loadItemForEdit research branch before qr_point or standard
LOAD = r'''
    } else if (item.type === 'research') {
      const meta = item.metadata || {};
      if ($('resTitle')) $('resTitle').value = item.title || '';
      if ($('resSlug')) { $('resSlug').value = item.slug || ''; $('resSlug').dataset.manual = 'true'; }
      if ($('resObjective')) $('resObjective').value = meta.objective || item.summary || '';
      if ($('resResponsible')) $('resResponsible').value = meta.responsibleBody || '';
      if ($('resStartDate')) $('resStartDate').value = item.startsAt ? new Date(item.startsAt).toISOString().slice(0,10) : (meta.startDate ? String(meta.startDate).slice(0,10) : '');
      if ($('resEndDate')) $('resEndDate').value = item.endsAt ? new Date(item.endsAt).toISOString().slice(0,10) : (meta.endDate ? String(meta.endDate).slice(0,10) : '');
      if ($('resAudience')) $('resAudience').value = meta.audience || 'Turistas';
      if ($('resParticipants')) $('resParticipants').value = meta.participants != null ? meta.participants : '';
      if ($('resCoverage')) $('resCoverage').value = item.location || meta.coverage || '';
      if ($('resMethodology')) $('resMethodology').value = meta.methodology || item.body || '';
      if ($('resSummaryResults')) $('resSummaryResults').value = meta.summaryResults || meta.resultsSummary || '';
      if ($('resConclusions')) $('resConclusions').value = meta.conclusions || '';
      if ($('resPhotoCredit')) $('resPhotoCredit').value = meta.photoCredit || '';
      if ($('resPhotoCaption')) $('resPhotoCaption').value = meta.photoCaption || '';
      if ($('resPhotoAlt')) $('resPhotoAlt').value = meta.photoAlt || '';
      if ($('resPublishDate')) $('resPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0,10) : '';
      if ($('resFeatured')) $('resFeatured').checked = item.featured === true;
      resHighlightedResults = Array.isArray(meta.highlightedResults) ? meta.highlightedResults.map(r => ({...r})) : [];
      renderResearchHighlightedResults();
      const pdfMedia = (item.media || []).find(m => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && String(m.url).toLowerCase().endsWith('.pdf')));
      if (meta.pdfFile && meta.pdfFile.url) resPdfFile = meta.pdfFile;
      else if (pdfMedia && pdfMedia.url) resPdfFile = { url: pdfMedia.url, name: pdfMedia.originalName || pdfMedia.title || 'relatorio.pdf', originalName: pdfMedia.originalName || pdfMedia.title || 'relatorio.pdf', size: pdfMedia.size || 0, sizeFormatted: pdfMedia.size ? ('PDF | ' + formatBytes(pdfMedia.size)) : 'PDF', mimeType: 'application/pdf' };
      else resPdfFile = null;
      renderResearchPdfPreview();
      const cover = (item.media || []).find(m => m.kind === 'image');
      if (meta.coverFile && meta.coverFile.url) resCoverFile = meta.coverFile;
      else if (meta.coverUrl) resCoverFile = { url: meta.coverUrl, name: 'capa.jpg', originalName: 'capa.jpg', size: 0, sizeFormatted: 'Imagem', mimeType: 'image/jpeg' };
      else if (cover && cover.url) resCoverFile = { url: cover.url, name: cover.title || 'capa.jpg', originalName: cover.title || 'capa.jpg', size: cover.size || 0, sizeFormatted: cover.size ? formatBytes(cover.size) : 'Imagem', mimeType: cover.mimeType || 'image/jpeg' };
      else resCoverFile = null;
      renderResearchCoverPreview();
      if ($('btnArchiveRes')) $('btnArchiveRes').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
'''

if "item.type === 'research'" not in text:
    if "item.type === 'qr_point'" in text:
        text = text.replace("    } else if (item.type === 'qr_point') {", LOAD + "\n    } else if (item.type === 'qr_point') {", 1)
    else:
        text = text.replace(
            "      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';\n    } else {",
            "      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';\n" + LOAD + "\n    } else {",
            1,
        )
    print("LOAD_INSERTED")

BUILD = r'''
    if (currentType === 'research') {
      const title = $('resTitle').value.trim();
      if (!title) { showNotice('Informe o título da pesquisa.', true); return null; }
      const slug = slugify($('resSlug').value) || slugify(title);
      if (!slug) { showNotice('Informe o slug da pesquisa.', true); return null; }
      const objective = $('resObjective').value.trim();
      if (!objective) { showNotice('Informe o objetivo da pesquisa.', true); return null; }
      const startDate = $('resStartDate').value;
      const endDate = $('resEndDate').value;
      if (!startDate || !endDate) { showNotice('Informe o período (data inicial e final).', true); return null; }
      if (endDate < startDate) { showNotice('A data final deve ser maior ou igual à data inicial.', true); return null; }
      const audience = $('resAudience').value;
      if (!audience) { showNotice('Selecione o público pesquisado.', true); return null; }
      const methodology = $('resMethodology').value.trim();
      if (!methodology) { showNotice('Informe a metodologia.', true); return null; }
      const summaryResults = $('resSummaryResults').value.trim();
      if (!summaryResults) { showNotice('Informe o resumo dos resultados.', true); return null; }
      if ((statusToSave === 'published' || statusToSave === 'review') && !(resPdfFile && resPdfFile.url)) {
        showNotice('Anexe o relatório PDF antes de publicar/enviar para revisão.', true); return null;
      }
      const participantsRaw = ($('resParticipants').value || '').trim();
      let participants = null;
      if (participantsRaw !== '') {
        participants = Number(participantsRaw);
        if (!Number.isFinite(participants) || participants < 0) {
          showNotice('Número de participantes inválido.', true); return null;
        }
      }
      const highlightedResults = (resHighlightedResults || []).filter(r => (r.indicator || '').trim() || r.value !== '' && r.value != null).map(r => ({
        indicator: String(r.indicator || '').trim(),
        value: r.value === '' || r.value == null ? null : Number(r.value),
        unit: String(r.unit || '').trim() || '%'
      }));
      for (const r of highlightedResults) {
        if (r.value != null && !Number.isFinite(r.value)) {
          showNotice('Há resultado destacado com valor inválido.', true); return null;
        }
      }
      const pubDateVal = $('resPublishDate').value;
      const publishedAt = pubDateVal ? new Date(pubDateVal).toISOString() : (statusToSave === 'published' ? new Date().toISOString() : undefined);
      const media = [];
      if (resCoverFile && resCoverFile.url) {
        media.push({ kind: 'image', title: title, url: resCoverFile.url, mimeType: resCoverFile.mimeType || 'image/jpeg', size: resCoverFile.size, caption: $('resPhotoCaption').value.trim(), credit: $('resPhotoCredit').value.trim(), alt: $('resPhotoAlt').value.trim(), isAccessible: !!$('resPhotoAlt').value.trim() });
      }
      if (resPdfFile && resPdfFile.url) {
        media.push({ kind: 'document', title: title, url: resPdfFile.url, mimeType: 'application/pdf', size: resPdfFile.size, originalName: resPdfFile.originalName || resPdfFile.name, isAccessible: true });
      }
      return {
        type: 'research',
        title,
        slug,
        summary: objective,
        body: methodology,
        location: $('resCoverage').value.trim(),
        featured: $('resFeatured').checked === true,
        startsAt: startDate,
        endsAt: endDate,
        publishedAt,
        status: statusToSave || 'draft',
        media,
        metadata: {
          objective,
          responsibleBody: $('resResponsible').value.trim(),
          audience,
          coverage: $('resCoverage').value.trim(),
          participants,
          methodology,
          summaryResults,
          conclusions: $('resConclusions').value.trim(),
          highlightedResults,
          startDate,
          endDate,
          photoCredit: $('resPhotoCredit').value.trim(),
          photoCaption: $('resPhotoCaption').value.trim(),
          photoAlt: $('resPhotoAlt').value.trim(),
          coverUrl: resCoverFile ? resCoverFile.url : '',
          coverFile: resCoverFile,
          pdfFile: resPdfFile,
          showOnPortal: true
        }
      };
    }

'''

if "if (currentType === 'research')" not in text.split("// Default / Standard")[0][-4000:]:
    text = text.replace("    // Default / Standard\n    const name = $('stdTitle').value.trim();", BUILD + "    // Default / Standard\n    const name = $('stdTitle').value.trim();", 1)
    print("BUILD_INSERTED")

# empty list message for research
if "Nenhuma pesquisa cadastrada" not in text:
    text = text.replace(
        """      } else if (currentType === 'news') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>`;
      }""",
        """      } else if (currentType === 'news') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>`;
      } else if (currentType === 'research') {
        listEl.innerHTML = `<div class="comtur-empty">${query ? 'Nenhuma pesquisa encontrada.' : 'Nenhuma pesquisa cadastrada.'}</div>`;
      }""",
        1,
    )
    print("EMPTY_MSG")

# research list card — inject before council or default card. Find "// 7. Default Standard Card" or news card
if "item.type === 'research'" not in text.split("function renderList")[1][:25000]:
    card = r'''
      if (item.type === 'research') {
        const meta = item.metadata || {};
        const start = item.startsAt || meta.startDate;
        const end = item.endsAt || meta.endDate;
        const period = (start || end)
          ? `${start ? new Date(start).toLocaleDateString('pt-BR') : '?'}${end ? ' – ' + new Date(end).toLocaleDateString('pt-BR') : ''}`
          : 'Período não informado';
        const pub = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '—';
        return `
          <button class="comtur-list-item ${isActive ? 'is-active' : ''}" type="button" data-id="${item._id}" style="padding:10px 12px; width:100%; text-align:left;">
            <div class="comtur-list-title" style="font-weight:700; font-size:0.92rem; margin-bottom:4px;">${escapeHtml(item.title || 'Sem título')}</div>
            <div style="font-size:0.78rem; color:var(--comtur-text-muted); margin-bottom:6px;">${escapeHtml(period)}</div>
            <div class="comtur-list-meta" style="display:flex; justify-content:space-between; align-items:center;">
              <span class="comtur-badge ${statusClass}">${statusLabel}</span>
              <span style="font-size:0.72rem; color:#64748b;">Pub.: ${escapeHtml(pub)}</span>
            </div>
          </button>
        `;
      }

'''
    # insert before legislation or default
    if "if (item.type === 'legislation')" in text:
        text = text.replace("      if (item.type === 'legislation') {", card + "      if (item.type === 'legislation') {", 1)
        print("LIST_CARD")
    elif "// 7. Default Standard Card" in text:
        text = text.replace("// 7. Default Standard Card", card + "      // 7. Default Standard Card", 1)
        print("LIST_CARD_DEFAULT")

# saveContent: call transition after save when status differs
OLD_SAVE_TAIL = """      showNotice(`Conteúdo salvo com sucesso como "${STATUS_LABELS[statusToSave] || statusToSave}"!`);
      await loadItems();
      const savedItem = allItems.find(i => i._id === (id || result._id || result.data?._id || result.item?._id));
      if (savedItem) loadItemForEdit(savedItem);"""

NEW_SAVE_TAIL = """      const saved = result.data || result.item || result;
      const savedId = id || saved?._id;
      if (savedId && statusToSave && saved?.status && saved.status !== statusToSave) {
        const tr = await send(`/api/comtur/admin/content/${savedId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusToSave })
        });
        if (!tr.ok) {
          const trData = await tr.json().catch(() => ({}));
          showNotice(trData.error || 'Conteúdo salvo, mas a mudança de status falhou.', true);
        }
      } else if (savedId && statusToSave && (!saved?.status || saved.status === 'draft') && statusToSave !== 'draft') {
        const tr = await send(`/api/comtur/admin/content/${savedId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusToSave })
        });
        if (!tr.ok) {
          const trData = await tr.json().catch(() => ({}));
          showNotice(trData.error || 'Conteúdo salvo, mas a mudança de status falhou.', true);
        }
      }
      showNotice(`Conteúdo salvo com sucesso como "${STATUS_LABELS[statusToSave] || statusToSave}"!`);
      await loadItems();
      const savedItem = allItems.find(i => i._id === savedId);
      if (savedItem) loadItemForEdit(savedItem);"""

if "admin/content/${savedId}/transition" not in text and OLD_SAVE_TAIL in text:
    text = text.replace(OLD_SAVE_TAIL, NEW_SAVE_TAIL, 1)
    print("TRANSITION_WIRED")

ADMIN.write_text(text, encoding="utf-8")
print("ADMIN_SIZE", ADMIN.stat().st_size)

# bump nav
nav = Path("/home/semit/Documentos/api-semit/backend/public/comtur-admin-nav.js")
nt = nav.read_text(encoding="utf-8")
nt2 = nt.replace("comtur-content-admin.html?v=16", "comtur-content-admin.html?v=17").replace("comtur-content-admin.html?v=15", "comtur-content-admin.html?v=17")
if nt2 != nt:
    nav.write_text(nt2, encoding="utf-8")
    print("NAV_v17")

print("DONE_ADMIN")
