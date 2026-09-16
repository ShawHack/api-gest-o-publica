const fs = require('fs');
const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert HTML for #legislationFields before #standardFields
const legisFieldsHtml = `
          <!-- ================================================================= -->
          <!-- 10. LEGISLAÇÃO / REPOSITÓRIO DOCUMENTAL (LEGISLATION FORM)        -->
          <!-- ================================================================= -->
          <div id="legislationFields" class="comtur-category-fields" style="display:none">

            <!-- SEÇÃO 1: Dados do Documento -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Dados do Documento</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="legisTitle">Título do documento <span class="req">*</span></label>
                  <input id="legisTitle" class="comtur-input" placeholder="Ex.: Lei nº 5.432/2026 — Dispõe sobre o Conselho Municipal de Turismo">
                </div>
                <div class="comtur-field">
                  <label for="legisDocType">Tipo de documento <span class="req">*</span></label>
                  <select id="legisDocType" class="comtur-select">
                    <option value="Lei" selected>Lei</option>
                    <option value="Lei Complementar">Lei Complementar</option>
                    <option value="Decreto">Decreto</option>
                    <option value="Portaria">Portaria</option>
                    <option value="Resolução">Resolução</option>
                    <option value="Regimento Interno">Regimento Interno</option>
                    <option value="Deliberação">Deliberação</option>
                    <option value="Instrução Normativa">Instrução Normativa</option>
                    <option value="Ato">Ato</option>
                    <option value="Edital">Edital</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label for="legisNumber">Número</label>
                      <input id="legisNumber" class="comtur-input" placeholder="Ex.: 5432">
                    </div>
                    <div>
                      <label for="legisYear">Ano <span class="req">*</span></label>
                      <input id="legisYear" type="number" min="1900" max="2100" class="comtur-input" placeholder="2026">
                    </div>
                  </div>
                </div>
                <div class="comtur-field">
                  <label for="legisOfficialIdentifier">Número completo / Identificação oficial</label>
                  <input id="legisOfficialIdentifier" class="comtur-input" placeholder="Ex.: Lei nº 5.432/2026">
                </div>
                <div class="comtur-field">
                  <label for="legisResponsibleBody">Órgão responsável</label>
                  <input id="legisResponsibleBody" class="comtur-input" placeholder="Ex.: Prefeitura Municipal, COMTUR, Secretaria de Turismo">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="legisSlug">Identificador na URL (slug) <span class="req">*</span></label>
                  <input id="legisSlug" class="comtur-input" placeholder="lei-5432-2026-conselho-municipal-de-turismo">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="legisSummary">Ementa / Resumo do documento <span class="req">*</span></label>
                  <textarea id="legisSummary" class="comtur-textarea" rows="3" placeholder="Ex.: Dispõe sobre a reestruturação do Conselho Municipal de Turismo (COMTUR), institui o Fundo Municipal de Turismo (FUMTUR) e dá outras providências..."></textarea>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 2: Datas do Documento -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Datas do Documento</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="legisDocumentDate">Data do documento <span class="req">*</span></label>
                  <input id="legisDocumentDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="legisPublicationDate">Data de publicação oficial</label>
                  <input id="legisPublicationDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="legisEffectiveFrom">Data de início da vigência</label>
                  <input id="legisEffectiveFrom" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="legisEffectiveUntil">Data de término da vigência (se aplicável)</label>
                  <input id="legisEffectiveUntil" type="date" class="comtur-input">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="legisLegalStatus">Situação jurídica da norma</label>
                  <select id="legisLegalStatus" class="comtur-select">
                    <option value="Vigente" selected>🟢 Vigente</option>
                    <option value="Alterado">🟡 Alterado</option>
                    <option value="Revogado">🔴 Revogado</option>
                    <option value="Suspenso">⚪ Suspenso</option>
                    <option value="Sem informação">Sem informação</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 3: Arquivo PDF (ESSENCIAL) -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Arquivo PDF do Documento <span class="req">*</span></div>
              <p class="comtur-hint" style="margin-bottom: 14px;">Anexe o arquivo oficial em PDF. O PDF é o documento principal que os cidadãos e conselheiros poderão visualizar e baixar.</p>
              
              <!-- Estado Vazio (Sem PDF) -->
              <div id="legisPdfEmpty" class="comtur-upload-zone" onclick="$('legisPdfFileInput').click()" style="cursor: pointer;">
                <input id="legisPdfFileInput" type="file" accept="application/pdf,.pdf" style="display:none">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">📄</div>
                <div style="font-weight: 700; color: var(--comtur-primary-dark); font-size: 1rem;">Clique para selecionar o arquivo PDF</div>
                <div class="comtur-hint">Formato obrigatório: PDF (.pdf) • Tamanho máximo: 20 MB</div>
              </div>

              <!-- Estado Anexado (Com Preview e Metadados) -->
              <div id="legisPdfPreview" style="display: none; background: #f0fdf4; border: 2px solid var(--comtur-primary-border); border-radius: var(--comtur-radius-lg); padding: 18px;">
                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; justify-content: space-between;">
                  <div style="display: flex; gap: 14px; align-items: center; min-width: 260px;">
                    <div style="width: 52px; height: 52px; background: #dc2626; color: #fff; border-radius: var(--comtur-radius-md); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; box-shadow: var(--comtur-shadow-sm);">PDF</div>
                    <div>
                      <div id="legisPdfFileNameDisplay" style="font-weight: 800; color: var(--comtur-primary-dark); font-size: 1rem; word-break: break-all;">nome_do_arquivo.pdf</div>
                      <div style="font-size: 0.82rem; color: var(--comtur-text-muted); margin-top: 2px;">
                        Tamanho: <strong id="legisPdfSizeDisplay">2,4 MB</strong> • Enviado em: <span id="legisPdfDateDisplay">15/08/2026</span>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button id="btnViewLegisPdf" type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="if(legisPdfFile&&legisPdfFile.url) window.open(legisPdfFile.url, '_blank')">👁️ Visualizar PDF</button>
                    <button id="btnReplaceLegisPdf" type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('legisPdfFileInput').click()">🔄 Substituir</button>
                    <button id="btnRemoveLegisPdf" type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="legisPdfFile = null; renderLegisPdfPreview();">🗑️ Remover</button>
                  </div>
                </div>
                <div class="comtur-field" style="margin-top: 14px; margin-bottom: 0;">
                  <label for="legisPdfTitle">Título do arquivo para download</label>
                  <input id="legisPdfTitle" class="comtur-input" placeholder="Ex.: Lei Municipal nº 5.432/2026 - Texto Integral">
                </div>
              </div>
              <div id="legisPdfProgress" class="comtur-hint" style="margin-top: 8px; font-weight: 600; color: var(--comtur-primary);"></div>
            </div>

            <!-- SEÇÃO 4: Classificação e Assuntos -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Classificação e Assuntos</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="legisCategory">Categoria temática</label>
                  <select id="legisCategory" class="comtur-select">
                    <option value="COMTUR" selected>COMTUR</option>
                    <option value="Fundo Municipal de Turismo">Fundo Municipal de Turismo</option>
                    <option value="Turismo">Turismo</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Planejamento">Planejamento</option>
                    <option value="Regionalização">Regionalização</option>
                    <option value="Administração">Administração</option>
                    <option value="Orçamento">Orçamento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="legisCustomTags">Tags adicionais (separadas por vírgula)</label>
                  <input id="legisCustomTags" class="comtur-input" placeholder="Ex.: eleições, regimento, 2026, governança">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label>Tags temáticas estruturadas</label>
                  <div id="legisTagsChips" class="comtur-chips-grid"></div>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 5: Documentos Relacionados -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">5</span> Documentos Relacionados</div>
              <p class="comtur-hint" style="margin-bottom: 12px;">Relacione normas e atos correlatos (ex.: leis alteradas, revogadas, decretos regulamentadores):</p>
              <div class="comtur-grid-2" style="background: #f8fafc; padding: 14px; border: 1px solid var(--comtur-border-light); border-radius: var(--comtur-radius-md); margin-bottom: 14px;">
                <div class="comtur-field" style="margin-bottom: 0;">
                  <label for="legisRelationTypeSelect">Tipo de relação</label>
                  <select id="legisRelationTypeSelect" class="comtur-select">
                    <option value="Altera">Altera o documento</option>
                    <option value="Alterado por">Alterado por</option>
                    <option value="Revoga">Revoga o documento</option>
                    <option value="Revogado por">Revogado por</option>
                    <option value="Regulamenta">Regulamenta</option>
                    <option value="Regulamentado por">Regulamentado por</option>
                    <option value="Regimento relacionado">Regimento relacionado</option>
                    <option value="Plano relacionado">Plano relacionado</option>
                    <option value="Correlato">Documento correlato</option>
                  </select>
                </div>
                <div class="comtur-field" style="margin-bottom: 0;">
                  <label for="legisRelatedDocSelect">Documento legal</label>
                  <div style="display: flex; gap: 8px;">
                    <select id="legisRelatedDocSelect" class="comtur-select" style="flex: 1;">
                      <option value="">-- Selecionar documento da Legislação --</option>
                    </select>
                    <button id="btnAddRelatedLegisDoc" type="button" class="comtur-btn comtur-btn-primary comtur-btn-sm" onclick="addLegisRelatedDoc()">+ Adicionar</button>
                  </div>
                </div>
              </div>
              <div id="legisRelatedDocsList"></div>
            </div>

            <!-- SEÇÃO 6: Publicação -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">6</span> Publicação</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="legisPublishDate">Data de publicação no portal</label>
                  <input id="legisPublishDate" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 26px;">
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                      <input id="legisShowOnPortal" type="checkbox" checked style="width: 16px; height: 16px; accent-color: var(--comtur-primary);">
                      <span>Exibir no Portal Público de Legislação</span>
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                      <input id="legisFeatured" type="checkbox" style="width: 16px; height: 16px; accent-color: var(--comtur-primary);">
                      <span>Documento em destaque no repositório</span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="comtur-actions-bar" style="margin-top: 20px;">
                <div class="comtur-actions-group">
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('draft')">Salvar Rascunho</button>
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('review')">Enviar para Revisão</button>
                  <button type="button" class="comtur-btn comtur-btn-primary" onclick="saveContent('published')">Publicar Documento</button>
                </div>
                <div class="comtur-actions-group">
                  <button id="btnArchiveLegis" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar</button>
                </div>
              </div>
            </div>

          </div>
`;

if (!content.includes('id="legislationFields"')) {
  content = content.replace(
    '<!-- 10. STANDARD / DOCUMENT FORM',
    legisFieldsHtml + '\n          <!-- 10. STANDARD / DOCUMENT FORM'
  );
}

// 2. Add Legislation JS Helpers
const legisHelpers = `
  // --- LEGISLATION (LEGISLAÇÃO) SPECIFIC LOGIC ---
  let legisPdfFile = null; // { url, name, originalName, size, sizeFormatted, mimeType, uploadedAt, title }
  let legisRelatedDocs = []; // [ { id, title, relationType } ]

  const LEGIS_TAGS = [
    { id: 'Conselho', label: 'Conselho' },
    { id: 'FUMTUR', label: 'FUMTUR' },
    { id: 'Plano Municipal', label: 'Plano Municipal' },
    { id: 'Mapa do Turismo', label: 'Mapa do Turismo' },
    { id: 'Cadastur', label: 'Cadastur' },
    { id: 'Governança', label: 'Governança' },
    { id: 'Legislação Turística', label: 'Legislação Turística' },
    { id: 'Fundo Municipal', label: 'Fundo Municipal' },
    { id: 'Normativa', label: 'Normativa' },
    { id: 'Eleições', label: 'Eleições' },
    { id: 'Regimento', label: 'Regimento' }
  ];

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderLegisPdfPreview() {
    const emptyBox = $('legisPdfEmpty');
    const previewBox = $('legisPdfPreview');
    if (!emptyBox || !previewBox) return;

    if (legisPdfFile && legisPdfFile.url) {
      emptyBox.style.display = 'none';
      previewBox.style.display = 'block';

      $('legisPdfFileNameDisplay').textContent = legisPdfFile.originalName || legisPdfFile.name || 'documento.pdf';
      $('legisPdfSizeDisplay').textContent = legisPdfFile.sizeFormatted || formatBytes(legisPdfFile.size) || 'PDF';
      $('legisPdfDateDisplay').textContent = legisPdfFile.uploadedAt ? new Date(legisPdfFile.uploadedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
      $('legisPdfTitle').value = legisPdfFile.title || ($('legisOfficialIdentifier') ? $('legisOfficialIdentifier').value : '') || ($('legisTitle') ? $('legisTitle').value : '') || '';
    } else {
      emptyBox.style.display = 'block';
      previewBox.style.display = 'none';
      if ($('legisPdfTitle')) $('legisPdfTitle').value = '';
    }
  }

  async function uploadLegisPdf(file) {
    if (!file) return;

    // Validate extension & mime
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      showNotice('Formato inválido. Por favor, envie apenas arquivos em formato PDF (.pdf).', true);
      return;
    }

    // Validate size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotice('Arquivo muito grande. O limite máximo para upload de PDF é de 20 MB.', true);
      return;
    }

    if (file.size === 0) {
      showNotice('O arquivo selecionado está vazio.', true);
      return;
    }

    const progressEl = $('legisPdfProgress');
    if (progressEl) progressEl.textContent = 'Enviando arquivo PDF...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const send = (window.SemitSession && typeof window.SemitSession.fetchWithAuth === 'function')
        ? window.SemitSession.fetchWithAuth.bind(window.SemitSession)
        : ((window.SemitSession && typeof window.SemitSession.fetchAuth === 'function')
            ? window.SemitSession.fetchAuth.bind(window.SemitSession)
            : fetch);
      const res = await send('/api/comtur/admin/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        legisPdfFile = {
          url: data.url,
          name: file.name,
          originalName: file.name,
          size: file.size,
          sizeFormatted: formatBytes(file.size),
          mimeType: 'application/pdf',
          uploadedAt: new Date().toISOString(),
          title: ($('legisOfficialIdentifier') ? $('legisOfficialIdentifier').value.trim() : '') || ($('legisTitle') ? $('legisTitle').value.trim() : '') || file.name.replace(/\\.pdf$/i, '')
        };
        renderLegisPdfPreview();
        if (progressEl) progressEl.textContent = 'PDF anexado com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
      } else {
        showNotice(\`Erro ao enviar PDF: \${data.error || 'Falha no upload'}\`, true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (err) {
      showNotice('Erro de conexão ao enviar arquivo PDF.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

  function renderLegisRelatedDocs() {
    const container = $('legisRelatedDocsList');
    if (!container) return;
    if (!legisRelatedDocs.length) {
      container.innerHTML = '<div class="comtur-hint" style="padding: 6px 0;">Nenhum documento relacionado vinculado.</div>';
      return;
    }

    container.innerHTML = legisRelatedDocs.map((rel, idx) => \`
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px solid var(--comtur-border-light); border-radius: var(--comtur-radius-md); margin-bottom: 8px;">
        <div>
          <span class="comtur-badge" style="background: #e2e8f0; color: #1e293b; font-weight: 700; margin-right: 8px;">\${rel.relationType}</span>
          <strong style="color: var(--comtur-primary-dark); font-size: 0.92rem;">\${rel.title}</strong>
        </div>
        <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeLegisRelatedDoc(\${idx})">Remover</button>
      </div>
    \`).join('');
  }

  window.removeLegisRelatedDoc = function(idx) {
    legisRelatedDocs.splice(idx, 1);
    renderLegisRelatedDocs();
  };

  window.addLegisRelatedDoc = function() {
    const select = $('legisRelatedDocSelect');
    const relationType = $('legisRelationTypeSelect').value;
    if (!select || !select.value) {
      showNotice('Selecione um documento da lista para adicionar.', true);
      return;
    }
    const docId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    const docTitle = selectedOption ? selectedOption.textContent : 'Documento';

    if (legisRelatedDocs.some(r => r.id === docId && r.relationType === relationType)) {
      showNotice('Este relacionamento já foi adicionado.', true);
      return;
    }

    legisRelatedDocs.push({
      id: docId,
      title: docTitle,
      relationType
    });
    renderLegisRelatedDocs();
    select.value = '';
  };

  function populateLegisAvailableRelatedSelect() {
    const select = $('legisRelatedDocSelect');
    if (!select) return;
    const currentDocId = $('id').value;
    const otherLegis = allItems.filter(item => item.type === 'legislation' && item._id !== currentDocId);
    let html = '<option value="">-- Selecionar documento da Legislação --</option>';
    otherLegis.forEach(doc => {
      const meta = doc.metadata || {};
      const ident = meta.officialIdentifier || doc.title;
      html += \`<option value="\${doc._id}">\${ident}</option>\`;
    });
    select.innerHTML = html;
  }
`;

if (!content.includes('// --- LEGISLATION (LEGISLAÇÃO) SPECIFIC LOGIC ---')) {
  content = content.replace(
    '// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---',
    legisHelpers + '\n  // --- CONTENT TYPE SWITCHING & FORM REGISTRY ---'
  );
}

// 3. onContentTypeChange - Add legislation handling
const targetOnContentType = `    } else if (currentType === 'council_member') {
      $('councilMemberFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else {`;

const replacementOnContentType = `    } else if (currentType === 'council_member') {
      $('councilMemberFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else if (currentType === 'legislation') {
      $('legislationFields').style.display = 'block';
      $('sharedNonGastroActions').style.display = 'none';
    } else {`;

content = content.replace(targetOnContentType, replacementOnContentType);

// 4. resetForm - Add btnArchiveLegis and legislation reset block
const targetBtnArchive = `if ($('btnArchiveCouncil')) $('btnArchiveCouncil').style.display = 'none';`;
const replacementBtnArchive = `if ($('btnArchiveCouncil')) $('btnArchiveCouncil').style.display = 'none';
    if ($('btnArchiveLegis')) $('btnArchiveLegis').style.display = 'none';`;

content = content.replace(targetBtnArchive, replacementBtnArchive);

const targetResetEnd = `if (clearSidebarActive) {
      document.querySelectorAll('.comtur-list-item').forEach(el => el.classList.remove('is-active'));
    }
  }`;

const legisResetBlock = `    if (currentType === 'legislation') {
      if ($('legisTitle')) {
        $('legisTitle').value = '';
        delete $('legisTitle').dataset.manual;
      }
      if ($('legisDocType')) $('legisDocType').value = 'Lei';
      if ($('legisNumber')) $('legisNumber').value = '';
      if ($('legisYear')) $('legisYear').value = new Date().getFullYear();
      if ($('legisOfficialIdentifier')) {
        $('legisOfficialIdentifier').value = '';
        delete $('legisOfficialIdentifier').dataset.manual;
      }
      if ($('legisResponsibleBody')) $('legisResponsibleBody').value = 'COMTUR';
      if ($('legisSlug')) {
        $('legisSlug').value = '';
        delete $('legisSlug').dataset.manual;
      }
      if ($('legisSummary')) $('legisSummary').value = '';
      if ($('legisDocumentDate')) $('legisDocumentDate').value = new Date().toISOString().slice(0, 10);
      if ($('legisPublicationDate')) $('legisPublicationDate').value = '';
      if ($('legisEffectiveFrom')) $('legisEffectiveFrom').value = '';
      if ($('legisEffectiveUntil')) $('legisEffectiveUntil').value = '';
      if ($('legisLegalStatus')) $('legisLegalStatus').value = 'Vigente';
      if ($('legisCategory')) $('legisCategory').value = 'COMTUR';
      if ($('legisCustomTags')) $('legisCustomTags').value = '';
      if ($('legisShowOnPortal')) $('legisShowOnPortal').checked = true;
      if ($('legisFeatured')) $('legisFeatured').checked = false;
      if ($('legisPublishDate')) $('legisPublishDate').value = '';
      
      legisPdfFile = null;
      renderLegisPdfPreview();
      if ($('legisPdfProgress')) $('legisPdfProgress').textContent = '';

      legisRelatedDocs = [];
      renderLegisRelatedDocs();
      renderChips('legisTagsChips', LEGIS_TAGS, []);
      populateLegisAvailableRelatedSelect();
    }

    ${targetResetEnd}`;

content = content.replace(targetResetEnd, legisResetBlock);

// 5. renderList - Add legislation specialized card renderer
const targetRenderCouncil = `      if (item.type === 'council_member') {`;

const legisRenderCard = `      if (item.type === 'legislation') {
        const meta = item.metadata || {};
        const docType = meta.documentType || meta.docType || 'Documento Legal';
        const officialIdent = meta.officialIdentifier || (meta.number ? \`\${docType} nº \${meta.number}\${meta.year ? '/' + meta.year : ''}\` : item.title);
        const docDate = meta.documentDate ? new Date(meta.documentDate).toLocaleDateString('pt-BR') : (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '');
        const legalStatus = meta.legalStatus || 'Vigente';
        const pdfAttached = (item.media && item.media.find(m => m.kind === 'document' || m.mimeType === 'application/pdf')) || meta.pdfFile;
        const pdfSize = pdfAttached?.sizeFormatted || (pdfAttached?.size ? formatBytes(pdfAttached.size) : 'PDF');

        return \`
          <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}" style="padding: 12px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
              <span class="comtur-badge" style="background: #e0f2fe; color: #0369a1; font-weight: 800; text-transform: uppercase; font-size: 0.74rem;">\${docType}</span>
              <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
            </div>
            <div class="comtur-list-title" style="margin-bottom: 3px; font-weight: 800; font-size: 0.95rem; color: var(--comtur-primary-dark); line-height: 1.3;">\${officialIdent}</div>
            <div style="font-size: 0.8rem; color: var(--comtur-text-muted); line-height: 1.35; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">\${item.summary || item.title}</div>
            <div class="comtur-list-meta" style="margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">\${docDate ? '📅 ' + docDate : ''}</span>
              \${pdfAttached ? \`<span style="font-size: 0.75rem; color: #dc2626; font-weight: 700;">📄 \${pdfSize}</span>\` : '<span style="font-size: 0.72rem; color: #94a3b8;">Sem PDF</span>'}
            </div>
          </button>
        \`;
      }

      if (item.type === 'council_member') {`;

content = content.replace(targetRenderCouncil, legisRenderCard);

// 6. loadItemForEdit - Add legislation data population
const targetLoadCouncil = `    } else if (item.type === 'council_member') {`;

const legisLoadItem = `    } else if (item.type === 'legislation') {
      $('legisTitle').value = item.title || '';
      $('legisDocType').value = meta.documentType || meta.docType || 'Lei';
      $('legisNumber').value = meta.number || '';
      $('legisYear').value = meta.year || (meta.documentDate ? new Date(meta.documentDate).getFullYear() : new Date().getFullYear());
      $('legisOfficialIdentifier').value = meta.officialIdentifier || '';
      $('legisOfficialIdentifier').dataset.manual = 'true';
      $('legisTitle').dataset.manual = 'true';
      $('legisResponsibleBody').value = meta.responsibleBody || meta.organization || 'COMTUR';
      $('legisSlug').value = item.slug || '';
      $('legisSlug').dataset.manual = 'true';
      $('legisSummary').value = item.summary || meta.ementa || '';

      // Section 2: Datas
      $('legisDocumentDate').value = meta.documentDate ? new Date(meta.documentDate).toISOString().slice(0, 10) : '';
      $('legisPublicationDate').value = meta.publicationDate ? new Date(meta.publicationDate).toISOString().slice(0, 10) : '';
      $('legisEffectiveFrom').value = meta.effectiveFrom ? new Date(meta.effectiveFrom).toISOString().slice(0, 10) : '';
      $('legisEffectiveUntil').value = meta.effectiveUntil ? new Date(meta.effectiveUntil).toISOString().slice(0, 10) : '';
      $('legisLegalStatus').value = meta.legalStatus || 'Vigente';

      // Section 3: PDF
      const pdfMedia = (item.media && item.media.find(m => m.kind === 'document' || m.mimeType === 'application/pdf')) || null;
      if (pdfMedia || meta.pdfFile) {
        legisPdfFile = meta.pdfFile || {
          url: pdfMedia.url,
          name: pdfMedia.title || 'documento.pdf',
          originalName: pdfMedia.title || 'documento.pdf',
          size: pdfMedia.size || 0,
          sizeFormatted: pdfMedia.size ? formatBytes(pdfMedia.size) : 'PDF',
          mimeType: 'application/pdf',
          uploadedAt: item.updatedAt || new Date().toISOString(),
          title: pdfMedia.title || meta.officialIdentifier || item.title
        };
      } else {
        legisPdfFile = null;
      }
      renderLegisPdfPreview();

      // Section 4: Classificação & Tags
      $('legisCategory').value = meta.category || 'COMTUR';
      $('legisCustomTags').value = Array.isArray(meta.customTags) ? meta.customTags.join(', ') : (meta.customTags || '');
      renderChips('legisTagsChips', LEGIS_TAGS, meta.tags || []);

      // Section 5: Documentos Relacionados
      legisRelatedDocs = Array.isArray(meta.relatedDocs) ? meta.relatedDocs : [];
      renderLegisRelatedDocs();
      populateLegisAvailableRelatedSelect();

      // Section 6: Publicação
      $('legisShowOnPortal').checked = meta.showOnPortal !== false;
      $('legisFeatured').checked = item.featured === true;
      $('legisPublishDate').value = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('btnArchiveLegis')) $('btnArchiveLegis').style.display = item.status === 'archived' ? 'none' : 'inline-flex';

    } else if (item.type === 'council_member') {`;

content = content.replace(targetLoadCouncil, legisLoadItem);

// 7. buildPayload - Add legislation payload generation
const targetBuildCouncil = `    if (currentType === 'council_member') {`;

const legisPayloadBlock = `    if (currentType === 'legislation') {
      const title = $('legisTitle').value.trim();
      const docType = $('legisDocType').value;
      const num = $('legisNumber').value.trim();
      const year = parseInt($('legisYear').value, 10) || new Date().getFullYear();
      const officialIdentifier = $('legisOfficialIdentifier').value.trim() || (num ? \`\${docType} nº \${num}/\${year}\` : title);
      const responsibleBody = $('legisResponsibleBody').value.trim() || 'COMTUR';
      const slug = slugify($('legisSlug').value) || slugify(officialIdentifier) || slugify(title);
      const summary = $('legisSummary').value.trim();
      const documentDate = $('legisDocumentDate').value || undefined;
      const publicationDate = $('legisPublicationDate').value || undefined;
      const effectiveFrom = $('legisEffectiveFrom').value || undefined;
      const effectiveUntil = $('legisEffectiveUntil').value || undefined;
      const legalStatus = $('legisLegalStatus').value;
      const category = $('legisCategory').value;
      const customTagsRaw = $('legisCustomTags').value.trim();
      const customTags = customTagsRaw ? customTagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
      const structuredTags = getSelectedChips('legisTagsChips');
      const allTags = Array.from(new Set([...structuredTags, ...customTags]));
      const showOnPortal = $('legisShowOnPortal').checked;
      const featured = $('legisFeatured').checked;
      const publishedAt = $('legisPublishDate').value ? new Date($('legisPublishDate').value).toISOString() : undefined;

      const media = [];
      if (legisPdfFile && legisPdfFile.url) {
        const pdfTitle = ($('legisPdfTitle') ? $('legisPdfTitle').value.trim() : '') || officialIdentifier || title;
        media.push({
          kind: 'document',
          title: pdfTitle,
          url: legisPdfFile.url,
          mimeType: 'application/pdf',
          size: legisPdfFile.size,
          originalName: legisPdfFile.originalName,
          isAccessible: true
        });
      }

      return {
        type: 'legislation',
        title: title || officialIdentifier,
        slug,
        summary,
        body: summary,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        metadata: {
          title: title || officialIdentifier,
          documentType: docType,
          docType,
          number: num,
          year,
          officialIdentifier,
          responsibleBody,
          documentDate,
          publicationDate,
          effectiveFrom,
          effectiveUntil,
          legalStatus,
          category,
          tags: allTags,
          customTags,
          structuredTags,
          pdfFile: legisPdfFile ? {
            ...legisPdfFile,
            title: ($('legisPdfTitle') ? $('legisPdfTitle').value.trim() : '') || officialIdentifier
          } : null,
          relatedDocs: legisRelatedDocs,
          showOnPortal,
          featured
        },
        media
      };
    }

    if (currentType === 'council_member') {`;

content = content.replace(targetBuildCouncil, legisPayloadBlock);

// 8. loadItems - Add legislation related select update
const targetLoadItemsCouncil = `} else if (currentType === 'council_member') {`;

const legisLoadItems = `} else if (currentType === 'legislation') {
        populateLegisAvailableRelatedSelect();
      } else if (currentType === 'council_member') {`;

content = content.replace(targetLoadItemsCouncil, legisLoadItems);

// 9. init() - Add listeners for Legislation
const targetInitListeners = `    // 8. Listeners for Membros do Conselho`;

const legisListeners = `    // 9. Listeners for Legislação
    function updateLegisAutoFields() {
      if ($('id').value) return; // Don't overwrite if editing existing
      const typeVal = $('legisDocType').value;
      const numVal = $('legisNumber').value.trim();
      const yearVal = $('legisYear').value.trim();
      const sumVal = $('legisSummary').value.trim();

      let ident = '';
      if (numVal && yearVal) {
        ident = \`\${typeVal} nº \${numVal}/\${yearVal}\`;
      } else if (numVal) {
        ident = \`\${typeVal} nº \${numVal}\`;
      }

      if (ident && !$('legisOfficialIdentifier').dataset.manual) {
        $('legisOfficialIdentifier').value = ident;
      }

      if (ident && !$('legisTitle').dataset.manual) {
        $('legisTitle').value = sumVal ? \`\${ident} — \${sumVal.slice(0, 100)}\` : ident;
      }

      if (!$('legisSlug').dataset.manual) {
        const slugSource = $('legisTitle').value || ident;
        if (slugSource) $('legisSlug').value = slugify(slugSource);
      }
    }

    $('legisDocType').addEventListener('change', updateLegisAutoFields);
    $('legisNumber').addEventListener('input', updateLegisAutoFields);
    $('legisYear').addEventListener('input', updateLegisAutoFields);
    
    $('legisOfficialIdentifier').addEventListener('input', () => {
      $('legisOfficialIdentifier').dataset.manual = 'true';
      if (!$('legisSlug').dataset.manual && !$('legisTitle').value) {
        $('legisSlug').value = slugify($('legisOfficialIdentifier').value);
      }
    });

    $('legisTitle').addEventListener('input', () => {
      $('legisTitle').dataset.manual = 'true';
      if (!$('id').value && !$('legisSlug').dataset.manual) {
        $('legisSlug').value = slugify($('legisTitle').value);
      }
    });

    $('legisSlug').addEventListener('input', () => {
      $('legisSlug').dataset.manual = 'true';
    });

    $('legisPdfFileInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadLegisPdf(e.target.files[0]);
      }
      e.target.value = '';
    });

    // 8. Listeners for Membros do Conselho`;

content = content.replace(targetInitListeners, legisListeners);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated comtur-content-admin.html for Legislation!');
