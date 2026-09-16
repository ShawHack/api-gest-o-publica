const fs = require('fs');

const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update renderList empty state with proper Portuguese gender concordances
const oldRenderEmpty = `if (!filtered.length) {
      if (currentType === 'indicator') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhum indicador encontrado.' : 'Nenhum indicador cadastrado.'}</div>\`;
      } else {
        const typeCfg = CONTENT_TYPES.find(c => c.id === currentType);
        const label = typeCfg ? typeCfg.label.toLowerCase() : 'item';
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? \`Nenhum \${label} encontrado.\` : \`Nenhum \${label} cadastrado.\`}</div>\`;
      }
      return;
    }`;

const newRenderEmpty = `if (!filtered.length) {
      if (currentType === 'indicator') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhum indicador encontrado.' : 'Nenhum indicador cadastrado.'}</div>\`;
      } else if (currentType === 'news') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhuma notícia encontrada.' : 'Nenhuma notícia cadastrada.'}</div>\`;
      } else if (currentType === 'legislation') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhum documento legal encontrado.' : 'Nenhum documento legal cadastrado.'}</div>\`;
      } else if (currentType === 'work_plan') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhum plano de trabalho encontrado.' : 'Nenhum plano de trabalho cadastrado.'}</div>\`;
      } else if (currentType === 'accountability') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhuma prestação de contas encontrada.' : 'Nenhuma prestação de contas cadastrada.'}</div>\`;
      } else {
        const typeCfg = CONTENT_TYPES.find(c => c.id === currentType);
        const label = typeCfg ? typeCfg.label.toLowerCase() : 'item';
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? \`Nenhum \${label} encontrado.\` : \`Nenhum \${label} cadastrado.\`}</div>\`;
      }
      return;
    }`;

if (content.includes(oldRenderEmpty)) {
  content = content.replace(oldRenderEmpty, newRenderEmpty);
}

// 2. Update loadItems catch block with specific message for news
const oldLoadCatch = `        if (currentType === 'indicator') {
          errorMsg = 'Não foi possível carregar os indicadores.';
        } else if (typeCfg) {
          errorMsg = \`Não foi possível carregar: \${typeCfg.listTitle.toLowerCase()}.\`;
        }`;

const newLoadCatch = `        if (currentType === 'indicator') {
          errorMsg = 'Não foi possível carregar os indicadores.';
        } else if (currentType === 'news') {
          errorMsg = 'Não foi possível carregar as notícias.';
        } else if (typeCfg) {
          errorMsg = \`Não foi possível carregar: \${typeCfg.listTitle.toLowerCase()}.\`;
        }`;

if (content.includes(oldLoadCatch)) {
  content = content.replace(oldLoadCatch, newLoadCatch);
}

// 3. Expose helper functions on window for onclick buttons in HTML
const windowBindsMarker = 'window.loadItemForEdit = loadItemForEdit;';
const windowBindsNew = `window.loadItemForEdit = loadItemForEdit;
  window.uploadNewsCover = uploadNewsCover;
  window.renderNewsCoverPreview = renderNewsCoverPreview;
  window.removeNewsCover = removeNewsCover;
  window.addIndMeasurement = addIndMeasurement;
  window.removeIndMeasurement = removeIndMeasurement;
  window.updateIndMeasurementField = updateIndMeasurementField;`;

if (!content.includes('window.uploadNewsCover = uploadNewsCover;')) {
  content = content.replace(windowBindsMarker, windowBindsNew);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Applied news empty & error refinements to comtur-content-admin.html');
