const fs = require('fs');

let content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// 1. Clean up the legislation logic section (around line 5597 to 5755)
// Let's replace the whole block between council legislation select and content type switching:
const oldBlockStart = content.indexOf('// --- LEGISLATION (LEGISLAÇÃO) SPECIFIC LOGIC ---');
const oldBlockEnd = content.indexOf('// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---');

if (oldBlockStart === -1 || oldBlockEnd === -1) {
  console.error('Could not find old legislation logic block!');
  process.exit(1);
}

const newLegisLogic = `// --- LEGISLATION (LEGISLAÇÃO / REPOSITÓRIO DE PDF) LOGIC ---
  let legisPdfFile = null;

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderLegisPdfPreview() {
    const emptyEl = $('legisPdfEmpty');
    const previewEl = $('legisPdfPreview');
    if (!emptyEl || !previewEl) return;

    if (legisPdfFile && legisPdfFile.url) {
      emptyEl.style.display = 'none';
      previewEl.style.display = 'block';
      const nameEl = $('legisPdfFileNameDisplay');
      const sizeEl = $('legisPdfSizeDisplay');
      if (nameEl) nameEl.textContent = legisPdfFile.originalName || legisPdfFile.name || 'documento.pdf';
      if (sizeEl) sizeEl.textContent = legisPdfFile.sizeFormatted || (legisPdfFile.size ? formatBytes(legisPdfFile.size) : 'PDF');
    } else {
      emptyEl.style.display = 'block';
      previewEl.style.display = 'none';
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
          uploadedAt: new Date().toISOString()
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

  `;

content = content.substring(0, oldBlockStart) + newLegisLogic + content.substring(oldBlockEnd);

// 2. Fix resetForm for legislation
const resetStart = content.indexOf("if (currentType === 'legislation') {", content.indexOf('function resetForm'));
const resetCouncil = content.indexOf("if (currentType === 'council') {", resetStart);
// Let's check where the legislation reset block ends
const resetNextBlock = content.indexOf("if (currentType === 'attraction')", resetStart);

const newLegisReset = `if (currentType === 'legislation') {
      if ($('legisTitle')) {
        $('legisTitle').value = '';
        delete $('legisTitle').dataset.manual;
      }
      if ($('legisDocType')) $('legisDocType').value = 'Lei';
      if ($('legisDocumentDate')) $('legisDocumentDate').value = new Date().toISOString().slice(0, 10);
      if ($('legisYear')) $('legisYear').value = new Date().getFullYear();
      if ($('legisSummary')) $('legisSummary').value = '';
      if ($('legisSlug')) {
        $('legisSlug').value = '';
        delete $('legisSlug').dataset.manual;
      }
      legisPdfFile = null;
      renderLegisPdfPreview();
      if ($('legisPdfProgress')) $('legisPdfProgress').textContent = '';
      if ($('btnArchiveLegis')) $('btnArchiveLegis').style.display = 'none';
    }

    `;

// Let's find exact bounds of the current legislation reset code
const legisResetMatch = content.match(/if \(currentType === 'legislation'\) \{[\s\S]*?renderChips\('legisTagsChips', LEGIS_TAGS, \[\]\);[\s\S]*?populateLegisAvailableRelatedSelect\(\);[\s\S]*?\}/);
if (legisResetMatch) {
  content = content.replace(legisResetMatch[0], newLegisReset.trim());
} else {
  console.log('Regex match for reset failed, finding by index');
}

// 3. Fix loadItemForEdit for legislation
const loadMatch = content.match(/\} else if \(item\.type === 'legislation'\) \{[\s\S]*?if \(\$('btnArchiveLegis')\) \$('btnArchiveLegis')\.style\.display = item\.status === 'archived' \? 'none' : 'inline-flex';[\s\S]*?\}/);

const newLegisLoad = `} else if (item.type === 'legislation') {
      if ($('legisTitle')) $('legisTitle').value = item.title || '';
      if ($('legisDocType')) $('legisDocType').value = meta.documentType || meta.docType || 'Lei';
      const docDate = meta.documentDate || item.publishedAt || '';
      if ($('legisDocumentDate')) $('legisDocumentDate').value = docDate ? new Date(docDate).toISOString().slice(0, 10) : '';
      if ($('legisYear')) $('legisYear').value = meta.year || (docDate ? new Date(docDate).getFullYear() : new Date().getFullYear());
      if ($('legisSummary')) $('legisSummary').value = item.summary || meta.description || meta.ementa || '';
      if ($('legisSlug')) {
        $('legisSlug').value = item.slug || '';
        $('legisSlug').dataset.manual = 'true';
      }

      // PDF Attachment
      const pdfMedia = (item.media && item.media.find(m => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && m.url.toLowerCase().endsWith('.pdf')))) || null;
      if (meta.pdfFile && meta.pdfFile.url) {
        legisPdfFile = meta.pdfFile;
      } else if (pdfMedia && pdfMedia.url) {
        legisPdfFile = {
          url: pdfMedia.url,
          name: pdfMedia.originalName || pdfMedia.title || 'documento.pdf',
          originalName: pdfMedia.originalName || pdfMedia.title || 'documento.pdf',
          size: pdfMedia.size || 0,
          sizeFormatted: pdfMedia.size ? formatBytes(pdfMedia.size) : 'PDF',
          mimeType: 'application/pdf'
        };
      } else {
        legisPdfFile = null;
      }
      renderLegisPdfPreview();

      if ($('btnArchiveLegis')) $('btnArchiveLegis').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
    }`;

if (loadMatch) {
  content = content.replace(loadMatch[0], newLegisLoad);
} else {
  console.log('Regex match for load failed');
}

// 4. Fix buildPayload for legislation
const buildMatch = content.match(/if \(currentType === 'legislation'\) \{[\s\S]*?relatedDocs: legisRelatedDocs,[\s\S]*?showOnPortal,[\s\S]*?featured[\s\S]*?\},[\s\S]*?media[\s\S]*?\};[\s\S]*?\}/);

const newLegisBuild = `if (currentType === 'legislation') {
      const title = $('legisTitle').value.trim();
      const docType = $('legisDocType').value;
      const documentDate = $('legisDocumentDate').value || undefined;
      const year = parseInt($('legisYear').value, 10) || (documentDate ? new Date(documentDate).getFullYear() : new Date().getFullYear());
      const summary = $('legisSummary').value.trim();
      const slug = slugify($('legisSlug').value) || slugify(title);
      const publishedAt = documentDate ? new Date(documentDate).toISOString() : (statusToSave === 'published' ? new Date().toISOString() : undefined);

      const media = [];
      if (legisPdfFile && legisPdfFile.url) {
        media.push({
          kind: 'document',
          title: title,
          url: legisPdfFile.url,
          mimeType: 'application/pdf',
          size: legisPdfFile.size,
          originalName: legisPdfFile.originalName || legisPdfFile.name,
          isAccessible: true
        });
      }

      return {
        type: 'legislation',
        title,
        slug,
        summary,
        body: summary,
        featured: false,
        publishedAt,
        status: statusToSave || 'draft',
        metadata: {
          title,
          documentType: docType,
          docType,
          documentDate,
          year,
          description: summary,
          pdfFile: legisPdfFile ? {
            ...legisPdfFile,
            title
          } : null,
          showOnPortal: true,
          featured: false
        },
        media
      };
    }`;

if (buildMatch) {
  content = content.replace(buildMatch[0], newLegisBuild);
} else {
  console.log('Regex match for build failed');
}

// 5. Fix renderList for legislation
const renderListMatch = content.match(/if \(item\.type === 'legislation'\) \{[\s\S]*?return \`[\s\S]*?\`;[\s\S]*?\}/);

const newLegisRenderList = `if (item.type === 'legislation') {
        const meta = item.metadata || {};
        const docType = meta.documentType || meta.docType || 'Documento';
        const docDate = meta.documentDate ? new Date(meta.documentDate).toLocaleDateString('pt-BR') : (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '');
        const pdfAttached = (item.media && item.media.some(m => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && m.url.toLowerCase().endsWith('.pdf')))) || !!meta.pdfFile;

        return \`
          <div class="comtur-card \${isActive ? 'is-active' : ''}" onclick="selectItem('\${item._id}')" style="display: flex; gap: 12px; align-items: center; padding: 12px 14px;">
            <div style="width: 36px; height: 36px; border-radius: var(--comtur-radius-md); background: \${pdfAttached ? '#fee2e2' : '#f1f5f9'}; color: \${pdfAttached ? '#dc2626' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; font-weight: 800;">
              \${pdfAttached ? '📄' : '📝'}
            </div>
            <div class="comtur-card-content" style="flex: 1; min-width: 0;">
              <div class="comtur-card-title" style="font-weight: 700; font-size: 0.94rem; margin-bottom: 3px; color: var(--comtur-primary-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="\${escapeHtml(item.title || '')}">
                \${escapeHtml(item.title || 'Sem título')}
              </div>
              <div style="display: flex; gap: 6px; align-items: center; font-size: 0.8rem; color: var(--comtur-text-muted); margin-bottom: 4px; flex-wrap: wrap;">
                <span style="font-weight: 600; color: var(--comtur-primary);">\${escapeHtml(docType)}</span>
                \${docDate ? \`<span>• \${docDate}</span>\` : ''}
              </div>
              <div>
                <span class="comtur-card-status \${statusClass}">\${statusLabel}</span>
              </div>
            </div>
          </div>
        \`;
      }`;

if (renderListMatch) {
  content = content.replace(renderListMatch[0], newLegisRenderList);
} else {
  console.log('Regex match for renderList failed');
}

// 6. Fix Listeners for Legislação in init()
const listenersMatch = content.match(/\/\/ 9\. Listeners for Legislação[\s\S]*?\/\/ 10\. Listeners for Standard/);

const newLegisListeners = `// 9. Listeners for Legislação
    if ($('legisDocumentDate')) {
      $('legisDocumentDate').addEventListener('change', () => {
        if ($('legisDocumentDate').value && $('legisYear')) {
          $('legisYear').value = new Date($('legisDocumentDate').value).getFullYear();
        }
      });
    }

    if ($('legisTitle')) {
      $('legisTitle').addEventListener('input', () => {
        $('legisTitle').dataset.manual = 'true';
        if (!$('id').value && $('legisSlug') && !$('legisSlug').dataset.manual) {
          $('legisSlug').value = slugify($('legisTitle').value);
        }
      });
    }

    if ($('legisSlug')) {
      $('legisSlug').addEventListener('input', () => {
        $('legisSlug').dataset.manual = 'true';
      });
    }

    if ($('legisPdfFileInput')) {
      $('legisPdfFileInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          uploadLegisPdf(e.target.files[0]);
        }
        e.target.value = '';
      });
    }

    // 10. Listeners for Standard`;

if (listenersMatch) {
  content = content.replace(listenersMatch[0], newLegisListeners);
} else {
  console.log('Regex match for listeners failed');
}

// Also remove populateLegisAvailableRelatedSelect call if present
content = content.replace(/populateLegisAvailableRelatedSelect\(\);/g, '');

fs.writeFileSync('comtur-next/portal/comtur-content-admin.html', content, 'utf8');
console.log('Successfully updated comtur-content-admin.html!');
