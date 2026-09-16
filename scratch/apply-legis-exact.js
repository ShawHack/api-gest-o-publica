const fs = require('fs');

let content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

// 1. Check loadItemForEdit
const loadItemMarker = "} else if (item.type === 'legislation') {";
const loadItemNext = "} else if (item.type === 'council_member') {";
const loadStart = content.indexOf(loadItemMarker);
const loadEnd = content.indexOf(loadItemNext, loadStart);

if (loadStart !== -1 && loadEnd !== -1) {
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
    `;
  content = content.substring(0, loadStart) + newLegisLoad + content.substring(loadEnd);
  console.log('Fixed loadItemForEdit for legislation!');
} else {
  console.error('Could not find loadItemForEdit boundaries', { loadStart, loadEnd });
}

// 2. Check renderList for legislation
const renderListMarker = "if (item.type === 'legislation') {";
const renderListNext = "if (item.type === 'council_member') {";
const rListStart = content.indexOf(renderListMarker);
const rListEnd = content.indexOf(renderListNext, rListStart);

if (rListStart !== -1 && rListEnd !== -1) {
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
      }

      `;
  content = content.substring(0, rListStart) + newLegisRenderList + content.substring(rListEnd);
  console.log('Fixed renderList for legislation!');
} else {
  console.error('Could not find renderList boundaries', { rListStart, rListEnd });
}

// 3. Check Listeners in init()
const listStartMarker = "// 9. Listeners for Legislação";
const listEndMarker = "// 10. Listeners for Standard";
const lStart = content.indexOf(listStartMarker);
const lEnd = content.indexOf(listEndMarker, lStart);

if (lStart !== -1 && lEnd !== -1) {
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

    `;
  content = content.substring(0, lStart) + newLegisListeners + content.substring(lEnd);
  console.log('Fixed init() listeners for legislation!');
} else {
  console.error('Could not find listeners boundaries', { lStart, lEnd });
}

fs.writeFileSync('comtur-next/portal/comtur-content-admin.html', content, 'utf8');
console.log('All admin fixes applied cleanly!');
