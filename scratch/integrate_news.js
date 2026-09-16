const fs = require('fs');

const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Insert newsFields HTML right after indicatorFields closing </div>
const indCloseIdx = content.indexOf('<!-- ================================================== -->\n          <!-- 13. STANDARD / DOCUMENT FORM');
const altCloseIdx = content.indexOf('<!-- 13. STANDARD / DOCUMENT FORM');
const targetCloseIdx = indCloseIdx !== -1 ? indCloseIdx : (altCloseIdx !== -1 ? altCloseIdx : content.indexOf('\n        </form>'));

if (targetCloseIdx === -1) {
  console.error('ERROR: Target HTML insertion point not found');
  process.exit(1);
}

const newsFormHtml = `<!-- ================================================== -->
          <!-- 13. NEWS / NOTÍCIA FORM                            -->
          <!-- ================================================== -->
          <div id="newsFields" class="comtur-category-fields" style="display:none">
            <input id="newsSlug" type="hidden">

            <!-- SEÇÃO 1: Dados da Notícia -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Dados da Notícia</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="newsTitle">Título da notícia <span class="req">*</span></label>
                  <input id="newsTitle" class="comtur-input" placeholder="Ex.: Garça recebe novo evento turístico neste fim de semana">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label for="newsSummary" style="margin-bottom: 0;">Resumo / Chamada <span class="req">*</span></label>
                    <span id="newsSummaryCount" style="font-size: 0.78rem; color: var(--comtur-text-muted); font-weight: 600;">0 / 250</span>
                  </div>
                  <textarea id="newsSummary" class="comtur-textarea" rows="2" maxlength="250" placeholder="Ex.: Breve resumo da matéria para exibição em cards, destaques e resultados de busca..."></textarea>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="newsBody">Conteúdo da notícia <span class="req">*</span></label>
                  <textarea id="newsBody" class="comtur-textarea" rows="10" placeholder="Escreva o texto completo da matéria jornalística..."></textarea>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 2: Imagem de Capa / Destaque -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Imagem de Capa & Destaque <span class="req">*</span></div>
              <p class="comtur-hint" style="margin-bottom: 14px;">A imagem de capa será utilizada na matéria completa, nos cards da listagem e no destaque da página inicial.</p>

              <!-- Estado Vazio (Sem Imagem) -->
              <div id="newsCoverEmpty" class="comtur-upload-zone" onclick="$('newsCoverFileInput').click()" style="cursor: pointer;">
                <input id="newsCoverFileInput" type="file" accept="image/jpeg,image/png,image/webp" style="display:none">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">📷</div>
                <div style="font-weight: 700; color: var(--comtur-primary-dark); font-size: 1rem; margin-bottom: 4px;">Clique ou arraste a imagem de capa aqui</div>
                <button type="button" class="comtur-btn comtur-btn-primary" style="margin-top: 6px; pointer-events: none;">Selecionar imagem</button>
                <div class="comtur-hint" style="margin-top: 8px;">Formatos aceitos: JPG, PNG ou WEBP • Tamanho máximo: 10 MB</div>
              </div>

              <!-- Estado Anexado (Com Preview e Ações) -->
              <div id="newsCoverPreview" style="display: none; background: #f8fafc; border: 1.5px solid var(--comtur-primary); border-radius: var(--comtur-radius-lg); padding: 18px;">
                <div style="display: flex; gap: 18px; align-items: center; flex-wrap: wrap; justify-content: space-between;">
                  <div style="display: flex; gap: 16px; align-items: center; min-width: 240px; flex: 1;">
                    <div style="width: 110px; height: 75px; border-radius: var(--comtur-radius-md); overflow: hidden; background: #e2e8f0; border: 1px solid var(--comtur-border-light); flex-shrink: 0;">
                      <img id="newsCoverImgDisplay" src="" alt="Capa" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div>
                      <div id="newsCoverFileNameDisplay" style="font-weight: 800; color: var(--comtur-primary-dark); font-size: 0.98rem; word-break: break-all;">capa.jpg</div>
                      <div style="font-size: 0.82rem; color: var(--comtur-text-muted); margin-top: 2px;">
                        Tamanho: <strong id="newsCoverSizeDisplay">1,2 MB</strong>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="$('newsCoverFileInput').click()">🔄 Trocar imagem</button>
                    <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-sm" onclick="removeNewsCover()">🗑️ Remover</button>
                  </div>
                </div>
              </div>
              <div id="newsCoverProgress" class="comtur-upload-progress" style="font-size: 0.85rem; color: var(--comtur-primary); margin-top: 8px; font-weight: 600;"></div>

              <!-- Metadados da Imagem -->
              <div class="comtur-grid-3" style="margin-top: 16px;">
                <div class="comtur-field">
                  <label for="newsPhotoCredit">Crédito / Autor da foto</label>
                  <input id="newsPhotoCredit" class="comtur-input" placeholder="Ex.: Secretaria Municipal de Turismo / João Silva">
                </div>
                <div class="comtur-field">
                  <label for="newsPhotoCaption">Legenda da imagem</label>
                  <input id="newsPhotoCaption" class="comtur-input" placeholder="Ex.: Público durante o evento no centro de Garça.">
                </div>
                <div class="comtur-field">
                  <label for="newsPhotoAlt">Texto alternativo (acessibilidade)</label>
                  <input id="newsPhotoAlt" class="comtur-input" placeholder="Ex.: Público reunido durante evento turístico em Garça.">
                </div>
              </div>
            </div>

            <!-- SEÇÃO 3: Informações da Publicação -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">3</span> Informações da Publicação</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="newsPublishedAt">Data da publicação</label>
                  <input id="newsPublishedAt" type="date" class="comtur-input">
                </div>
                <div class="comtur-field">
                  <label for="newsAuthor">Autor / Responsável</label>
                  <input id="newsAuthor" class="comtur-input" placeholder="Ex.: Secretaria de Comunicação / Redação COMTUR">
                </div>
                <div class="comtur-field">
                  <label for="newsCategory">Categoria da notícia <span class="req">*</span></label>
                  <select id="newsCategory" class="comtur-select">
                    <option value="Turismo" selected>Turismo</option>
                    <option value="Eventos">Eventos</option>
                    <option value="COMTUR">COMTUR</option>
                    <option value="Cultura">Cultura</option>
                    <option value="Gastronomia">Gastronomia</option>
                    <option value="Meio Ambiente">Meio Ambiente</option>
                    <option value="Desenvolvimento Turístico">Desenvolvimento Turístico</option>
                    <option value="Institucional">Institucional</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="newsLocation">Local / referência</label>
                  <input id="newsLocation" class="comtur-input" placeholder="Ex.: Bosque Municipal, Centro, Garça/SP">
                </div>
              </div>
            </div>

            <!-- SEÇÃO 4: Publicação -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">4</span> Publicação</div>
              <div class="comtur-field" style="margin-bottom: 18px;">
                <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                  <input id="newsFeatured" type="checkbox">
                  <span>⭐ Exibir em evidência / Destaque na página principal</span>
                </label>
              </div>

              <div class="comtur-actions-bar">
                <div class="comtur-actions-group">
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('draft')">💾 Salvar Rascunho</button>
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('review')">🔍 Enviar para Revisão</button>
                  <button type="button" class="comtur-btn comtur-btn-success" onclick="saveContent('published')">🚀 Publicar Imediatamente</button>
                </div>
                <div class="comtur-actions-group">
                  <button id="btnArchiveNews" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Arquivar Notícia</button>
                </div>
              </div>
            </div>

          </div>

          `;

content = content.substring(0, targetCloseIdx) + newsFormHtml + content.substring(targetCloseIdx);

// 2. Add state variable
content = content.replace('let indMeasurements = [];', 'let indMeasurements = [];\n  let newsCoverFile = null;');

// 3. Add news helper functions before // --- CONTENT TYPE SWITCHING & FORM REGISTRY ---
const newsHelpersCode = `  // --- NEWS SPECIFIC HELPERS ---
  async function uploadNewsCover(file) {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showNotice('Formato de arquivo inválido. Selecione uma imagem JPG, PNG ou WEBP.', true);
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      showNotice('Arquivo muito grande. O tamanho máximo permitido é 10 MB.', true);
      return;
    }

    const progressEl = $('newsCoverProgress');
    if (progressEl) progressEl.textContent = 'Enviando imagem de capa...';

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
        newsCoverFile = {
          url: data.url,
          name: file.name,
          originalName: file.name,
          size: file.size,
          sizeFormatted: formatBytes(file.size),
          mimeType: file.type
        };
        renderNewsCoverPreview();
        if (progressEl) progressEl.textContent = 'Imagem enviada com sucesso!';
        setTimeout(() => { if (progressEl) progressEl.textContent = ''; }, 3000);
      } else {
        showNotice(\`Erro ao enviar imagem: \${data.error || 'Falha no upload'}\`, true);
        if (progressEl) progressEl.textContent = '';
      }
    } catch (err) {
      console.error('News upload error:', err);
      showNotice('Erro de rede ao enviar imagem de capa.', true);
      if (progressEl) progressEl.textContent = '';
    }
  }

  function renderNewsCoverPreview() {
    const emptyEl = $('newsCoverEmpty');
    const previewEl = $('newsCoverPreview');
    const imgDisplay = $('newsCoverImgDisplay');
    const nameDisplay = $('newsCoverFileNameDisplay');
    const sizeDisplay = $('newsCoverSizeDisplay');

    if (newsCoverFile && newsCoverFile.url) {
      if (emptyEl) emptyEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'block';
      if (imgDisplay) imgDisplay.src = newsCoverFile.url;
      if (nameDisplay) nameDisplay.textContent = newsCoverFile.name || newsCoverFile.originalName || 'imagem-capa.jpg';
      if (sizeDisplay) sizeDisplay.textContent = newsCoverFile.sizeFormatted || (newsCoverFile.size ? formatBytes(newsCoverFile.size) : 'Imagem');
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
      if (previewEl) previewEl.style.display = 'none';
      if (imgDisplay) imgDisplay.src = '';
    }
  }

  function removeNewsCover() {
    if (confirm('Deseja realmente remover a imagem de capa desta notícia?')) {
      newsCoverFile = null;
      renderNewsCoverPreview();
    }
  }
`;

const ctSwitchMarker = '// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---';
content = content.replace(ctSwitchMarker, newsHelpersCode + '\n  ' + ctSwitchMarker);

// 4. Update specializedMap
content = content.replace(
  "'indicator': 'indicatorFields'",
  "'indicator': 'indicatorFields',\n      'news': 'newsFields'"
);

// 5. Update resetForm for news
const resetIndEnd = "if (clearSidebarActive)";
const resetNewsCode = `if (currentType === 'news') {
      if ($('newsTitle')) {
        $('newsTitle').value = '';
        delete $('newsTitle').dataset.manual;
      }
      if ($('newsSlug')) {
        $('newsSlug').value = '';
        delete $('newsSlug').dataset.manual;
      }
      if ($('newsSummary')) {
        $('newsSummary').value = '';
        if ($('newsSummaryCount')) $('newsSummaryCount').textContent = '0 / 250';
      }
      if ($('newsBody')) $('newsBody').value = '';
      if ($('newsCategory')) $('newsCategory').value = 'Turismo';
      if ($('newsAuthor')) $('newsAuthor').value = '';
      if ($('newsPublishedAt')) $('newsPublishedAt').value = new Date().toISOString().slice(0, 10);
      if ($('newsLocation')) $('newsLocation').value = '';
      if ($('newsPhotoCredit')) $('newsPhotoCredit').value = '';
      if ($('newsPhotoCaption')) $('newsPhotoCaption').value = '';
      if ($('newsPhotoAlt')) $('newsPhotoAlt').value = '';
      if ($('newsFeatured')) $('newsFeatured').checked = false;

      newsCoverFile = null;
      renderNewsCoverPreview();
      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = 'none';
    }

    `;

const resetTarget = content.indexOf(resetIndEnd, content.indexOf('function resetForm'));
content = content.substring(0, resetTarget) + resetNewsCode + content.substring(resetTarget);

// 6. Update renderList: specialized card for news & empty state
const indCardMarker = "// 6. Default Standard Card";
const newsCardCode = `// 6. News Card
      if (item.type === 'news') {
        const meta = item.metadata || {};
        const coverPhoto = (item.media && item.media.find(m => m.kind === 'image' || m.type === 'image' || m.type === 'photo')) || null;
        const coverUrl = coverPhoto?.url || meta.coverUrl || (meta.coverFile && meta.coverFile.url) || '';
        const catVal = meta.category || 'Geral';
        const dateVal = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '';

        return \`
          <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}" style="padding: 10px 12px; width: 100%; text-align: left;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 44px; height: 44px; border-radius: var(--comtur-radius-md); overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--comtur-border-light);">
                \${coverUrl ? \`<img src="\${escapeHtml(coverUrl)}" alt="" style="width: 100%; height: 100%; object-fit: cover;">\` : \`<span style="font-size: 1.2rem;">📰</span>\`}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="comtur-list-title" style="font-weight: 700; font-size: 0.92rem; margin-bottom: 2px; color: var(--comtur-primary-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  \${escapeHtml(item.title || 'Sem título')}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; font-size: 0.78rem; color: var(--comtur-text-muted); line-height: 1.2;">
                  <span style="font-weight: 700; color: var(--comtur-primary);">\${escapeHtml(catVal)}</span>
                  \${dateVal ? \`<span>• \${dateVal}</span>\` : ''}
                </div>
              </div>
            </div>
            <div class="comtur-list-meta" style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
              \${item.featured ? '<span style="font-size: 0.75rem; font-weight: 700; color: #d97706;">⭐ DESTAQUE</span>' : ''}
            </div>
          </button>
        \`;
      }

      // 7. Default Standard Card`;

content = content.replace(indCardMarker, newsCardCode);

// 7. Update loadItemForEdit for news
const loadStdMarker = "} else {\n      // Standard / Default\n      if ($('stdTitle')) $('stdTitle').value = item.title || '';";
const loadNewsCode = `} else if (item.type === 'news') {
      if ($('newsTitle')) $('newsTitle').value = item.title || '';
      if ($('newsSlug')) {
        $('newsSlug').value = item.slug || '';
        $('newsSlug').dataset.manual = 'true';
      }
      if ($('newsSummary')) {
        $('newsSummary').value = item.summary || '';
        if ($('newsSummaryCount')) $('newsSummaryCount').textContent = \`\${$('newsSummary').value.length} / 250\`;
      }
      if ($('newsBody')) $('newsBody').value = item.body || '';

      const meta = item.metadata || {};
      if ($('newsCategory')) $('newsCategory').value = meta.category || 'Turismo';
      if ($('newsAuthor')) $('newsAuthor').value = meta.author || '';
      const pubDate = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '';
      if ($('newsPublishedAt')) $('newsPublishedAt').value = pubDate;
      if ($('newsLocation')) $('newsLocation').value = (typeof item.location === 'string' ? item.location : item.location?.street) || meta.location || '';

      if ($('newsPhotoCredit')) $('newsPhotoCredit').value = meta.photoCredit || meta.credit || '';
      if ($('newsPhotoCaption')) $('newsPhotoCaption').value = meta.photoCaption || meta.caption || '';
      if ($('newsPhotoAlt')) $('newsPhotoAlt').value = meta.photoAlt || meta.alt || '';
      if ($('newsFeatured')) $('newsFeatured').checked = item.featured === true;

      // Cover Image
      const coverPhoto = (item.media && item.media.find(m => m.kind === 'image' || m.type === 'image' || m.type === 'photo')) || null;
      if (meta.coverFile && meta.coverFile.url) {
        newsCoverFile = meta.coverFile;
      } else if (meta.coverUrl) {
        newsCoverFile = {
          url: meta.coverUrl,
          name: meta.coverUrl.split('/').pop() || 'capa.jpg',
          originalName: meta.coverUrl.split('/').pop() || 'capa.jpg',
          size: 0,
          sizeFormatted: 'Imagem anexada',
          mimeType: 'image/jpeg'
        };
      } else if (coverPhoto && coverPhoto.url) {
        newsCoverFile = {
          url: coverPhoto.url,
          name: coverPhoto.title || coverPhoto.originalName || 'capa.jpg',
          originalName: coverPhoto.originalName || coverPhoto.title || 'capa.jpg',
          size: coverPhoto.size || 0,
          sizeFormatted: coverPhoto.size ? formatBytes(coverPhoto.size) : 'Imagem anexada',
          mimeType: coverPhoto.mimeType || 'image/jpeg'
        };
      } else {
        newsCoverFile = null;
      }
      renderNewsCoverPreview();

      if ($('btnArchiveNews')) $('btnArchiveNews').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
    `;

content = content.replace(loadStdMarker, loadNewsCode + loadStdMarker);

// 8. Update buildPayload for news (enforcing required image for review and published)
const bpStdMarker = "// Default / Standard\n    const name = $('stdTitle').value.trim();";
const bpNewsCode = `if (currentType === 'news') {
      const title = $('newsTitle').value.trim();
      if (!title) {
        showNotice('O título da notícia é obrigatório.', true);
        return null;
      }
      const slug = slugify($('newsSlug').value) || slugify(title);
      const summary = $('newsSummary').value.trim();
      if (!summary) {
        showNotice('O resumo / chamada da notícia é obrigatório.', true);
        return null;
      }
      const body = $('newsBody').value.trim();
      if (!body) {
        showNotice('O conteúdo da notícia é obrigatório.', true);
        return null;
      }

      // Validação obrigatória de imagem de capa para publicação ou revisão
      if ((statusToSave === 'published' || statusToSave === 'review') && (!newsCoverFile || !newsCoverFile.url)) {
        showNotice('Adicione uma imagem de capa antes de publicar a notícia.', true);
        return null;
      }

      const category = $('newsCategory').value;
      const author = $('newsAuthor').value.trim();
      const location = $('newsLocation').value.trim();
      const photoCredit = $('newsPhotoCredit').value.trim();
      const photoCaption = $('newsPhotoCaption').value.trim();
      const photoAlt = $('newsPhotoAlt').value.trim();
      const featured = $('newsFeatured').checked;
      const pubDateVal = $('newsPublishedAt').value;
      const publishedAt = pubDateVal ? new Date(pubDateVal).toISOString() : (statusToSave === 'published' ? new Date().toISOString() : undefined);

      const media = [];
      if (newsCoverFile && newsCoverFile.url) {
        media.push({
          kind: 'image',
          title: title,
          caption: photoCaption,
          credit: photoCredit,
          alt: photoAlt,
          url: newsCoverFile.url,
          mimeType: newsCoverFile.mimeType || 'image/jpeg',
          size: newsCoverFile.size,
          isAccessible: !!photoAlt
        });
      }

      return {
        type: 'news',
        title,
        slug,
        summary,
        body,
        location,
        featured,
        publishedAt,
        status: statusToSave || 'draft',
        metadata: {
          title,
          category,
          author,
          location,
          photoCredit,
          photoCaption,
          photoAlt,
          coverUrl: newsCoverFile ? newsCoverFile.url : '',
          coverFile: newsCoverFile,
          showOnPortal: true,
          featured
        },
        media
      };
    }

    `;

content = content.replace(bpStdMarker, bpNewsCode + bpStdMarker);

// 9. Update init() listeners for news
const initStdMarker = "// 13. Standard / Global Listeners";
const initNewsCode = `// 13. News Listeners
    if ($('newsTitle')) {
      $('newsTitle').addEventListener('input', () => {
        $('newsTitle').dataset.manual = 'true';
        if (!$('id').value && $('newsSlug') && !$('newsSlug').dataset.manual) {
          $('newsSlug').value = slugify($('newsTitle').value);
        }
      });
    }
    if ($('newsSlug')) {
      $('newsSlug').addEventListener('input', () => {
        $('newsSlug').dataset.manual = 'true';
      });
    }
    if ($('newsSummary')) {
      $('newsSummary').addEventListener('input', () => {
        if ($('newsSummaryCount')) $('newsSummaryCount').textContent = \`\${$('newsSummary').value.length} / 250\`;
      });
    }
    if ($('newsCoverFileInput')) {
      $('newsCoverFileInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          uploadNewsCover(e.target.files[0]);
        }
        e.target.value = '';
      });
    }

    // Drag and Drop on newsCoverEmpty
    const newsDrop = $('newsCoverEmpty');
    if (newsDrop) {
      ['dragenter', 'dragover'].forEach(eventName => {
        newsDrop.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          newsDrop.style.borderColor = 'var(--comtur-primary)';
          newsDrop.style.background = '#f0fdf4';
        }, false);
      });
      ['dragleave', 'drop'].forEach(eventName => {
        newsDrop.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          newsDrop.style.borderColor = '';
          newsDrop.style.background = '';
        }, false);
      });
      newsDrop.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          uploadNewsCover(e.dataTransfer.files[0]);
        }
      }, false);
    }

    // 14. Standard / Global Listeners`;

content = content.replace(initStdMarker, initNewsCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully integrated News specialized module into comtur-content-admin.html!');
