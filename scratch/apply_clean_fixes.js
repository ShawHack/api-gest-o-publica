const fs = require('fs');

const filePath = 'comtur-next/portal/comtur-content-admin.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Section 1 of indicatorFields
const s1 = content.indexOf('<div id="indicatorFields"');
const e1 = content.indexOf('<!-- SEÇÃO 2: Origem do Dado -->', s1);
if (s1 === -1 || e1 === -1) {
  console.error('ERROR: Section 1 not found');
  process.exit(1);
}
const section1New = `<div id="indicatorFields" class="comtur-category-fields" style="display:none">
            <input id="indSlug" type="hidden">

            <!-- SEÇÃO 1: Identificação do Indicador -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">1</span> Identificação do Indicador</div>
              <div class="comtur-grid-2">
                <div class="comtur-field comtur-grid-full">
                  <label for="indName">Nome do indicador <span class="req">*</span></label>
                  <input id="indName" class="comtur-input" placeholder="Ex.: Total de atrativos turísticos">
                </div>
                <div class="comtur-field">
                  <label for="indCategory">Categoria temática <span class="req">*</span></label>
                  <select id="indCategory" class="comtur-select">
                    <option value="Atrativos Turísticos" selected>Atrativos Turísticos</option>
                    <option value="Hospedagem & Ocupação">Hospedagem & Ocupação</option>
                    <option value="Gastronomia">Gastronomia</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Roteiros & Circuitos">Roteiros & Circuitos</option>
                    <option value="Serviços ao Turista">Serviços ao Turista</option>
                    <option value="Economia & Fluxo Turístico">Economia & Fluxo Turístico</option>
                    <option value="Gestão & Governança">Gestão & Governança</option>
                    <option value="Pesquisa & Satisfação">Pesquisa & Satisfação</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="indStatusSelect">Status do indicador <span class="req">*</span></label>
                  <select id="indStatusSelect" class="comtur-select">
                    <option value="published" selected>Ativo</option>
                    <option value="draft">Inativo</option>
                  </select>
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="indDescription">Descrição e metodologia do indicador</label>
                  <textarea id="indDescription" class="comtur-textarea" rows="2" placeholder="Ex.: Total de atrativos turísticos ativos publicados no portal."></textarea>
                </div>
              </div>
            </div>

            `;
content = content.substring(0, s1) + section1New + content.substring(e1);

// 2. Update Helpers
const sHelp = content.indexOf('// --- INDICATOR CONSTANTS & HELPERS ---');
const eHelp = content.indexOf('// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---', sHelp);
if (sHelp === -1 || eHelp === -1) {
  console.error('ERROR: Helpers not found');
  process.exit(1);
}
const helpersNew = `// --- INDICATOR CONSTANTS & HELPERS ---
  const AUTOMATIC_METRIC_CONFIGS = [
    { key: 'attractions.total', label: 'Total de atrativos turísticos', unit: 'atrativos', defaultCategory: 'Atrativos Turísticos' },
    { key: 'lodging.total', label: 'Total de hospedagens', unit: 'estabelecimentos', defaultCategory: 'Hospedagem & Ocupação' },
    { key: 'lodging.units', label: 'Total de UHs', unit: 'UHs', defaultCategory: 'Hospedagem & Ocupação' },
    { key: 'lodging.beds', label: 'Total de leitos', unit: 'leitos', defaultCategory: 'Hospedagem & Ocupação' },
    { key: 'lodging.capacity', label: 'Capacidade total de hóspedes', unit: 'hóspedes', defaultCategory: 'Hospedagem & Ocupação' },
    { key: 'gastronomy.total', label: 'Total de estabelecimentos gastronômicos', unit: 'estabelecimentos', defaultCategory: 'Gastronomia' },
    { key: 'events.total', label: 'Total de eventos publicados', unit: 'eventos', defaultCategory: 'Eventos' },
    { key: 'routes.total', label: 'Total de roteiros', unit: 'roteiros', defaultCategory: 'Roteiros & Circuitos' },
    { key: 'services.total', label: 'Total de serviços turísticos', unit: 'serviços', defaultCategory: 'Serviços ao Turista' }
  ];

  function calculateSystemMetric(metricKey, items) {
    const activeItems = Array.isArray(items) ? items : [];
    switch (metricKey) {
      case 'attractions.total':
        return activeItems.filter(i => i.type === 'attraction' && i.status === 'published').length;
      case 'lodging.total':
        return activeItems.filter(i => i.type === 'lodging' && i.status === 'published').length;
      case 'lodging.units':
        return activeItems.filter(i => i.type === 'lodging' && i.status === 'published').reduce((acc, i) => {
          const val = parseInt(i.metadata?.totalUnits, 10);
          if (!isNaN(val) && val > 0) return acc + val;
          if (Array.isArray(i.metadata?.rooms)) {
            const roomUnits = i.metadata.rooms.reduce((rAcc, r) => rAcc + (parseInt(r.unitsCount, 10) || 1), 0);
            return acc + roomUnits;
          }
          return acc;
        }, 0);
      case 'lodging.beds':
        return activeItems.filter(i => i.type === 'lodging' && i.status === 'published').reduce((acc, i) => {
          const val = parseInt(i.metadata?.totalBeds, 10);
          return acc + (!isNaN(val) && val > 0 ? val : 0);
        }, 0);
      case 'lodging.capacity':
        return activeItems.filter(i => i.type === 'lodging' && i.status === 'published').reduce((acc, i) => {
          const val = parseInt(i.metadata?.maxGuests, 10);
          return acc + (!isNaN(val) && val > 0 ? val : 0);
        }, 0);
      case 'gastronomy.total':
        return activeItems.filter(i => i.type === 'gastronomy' && i.status === 'published').length;
      case 'events.total':
        return activeItems.filter(i => i.type === 'event' && i.status === 'published').length;
      case 'routes.total':
        return activeItems.filter(i => i.type === 'route' && i.status === 'published').length;
      case 'services.total':
        return activeItems.filter(i => i.type === 'service' && i.status === 'published').length;
      default:
        return 0;
    }
  }

  function populateIndMetricSelect() {
    const sel = $('indMetricKey');
    if (!sel) return;
    sel.innerHTML = AUTOMATIC_METRIC_CONFIGS.map(m => \`<option value="\${escapeHtml(m.key)}">\${escapeHtml(m.label)}</option>\`).join('');
  }

  function updateIndAutoPreview() {
    const key = $('indMetricKey') ? $('indMetricKey').value : 'attractions.total';
    const cfg = AUTOMATIC_METRIC_CONFIGS.find(m => m.key === key) || AUTOMATIC_METRIC_CONFIGS[0];
    const val = calculateSystemMetric(key, allItems);

    if ($('indAutoMetricLabel')) $('indAutoMetricLabel').textContent = cfg.label;
    if ($('indAutoMetricValue')) $('indAutoMetricValue').textContent = String(val);
    if ($('indAutoMetricUnit')) $('indAutoMetricUnit').textContent = \`\${cfg.unit} ativos\`;
  }

  function updateIndSourceTypeView(sourceType = 'automatic') {
    const isAuto = sourceType === 'automatic';
    const autoRadio = document.querySelector('input[name="indSourceTypeRadio"][value="automatic"]');
    const manualRadio = document.querySelector('input[name="indSourceTypeRadio"][value="manual"]');
    if (autoRadio) autoRadio.checked = isAuto;
    if (manualRadio) manualRadio.checked = !isAuto;

    if ($('indSourceAutoPanel')) $('indSourceAutoPanel').style.display = isAuto ? 'block' : 'none';
    if ($('indSourceManualPanel')) $('indSourceManualPanel').style.display = isAuto ? 'none' : 'block';
    if ($('indHistorySection')) $('indHistorySection').style.display = isAuto ? 'none' : 'block';

    if ($('indSectionNumVis')) $('indSectionNumVis').textContent = isAuto ? '3' : '4';
    if ($('indSectionNumActions')) $('indSectionNumActions').textContent = isAuto ? '4' : '5';

    if (isAuto) {
      updateIndAutoPreview();
    }
  }

  function renderIndMeasurements() {
    const tbody = $('indMeasurementsTableBody');
    const emptyEl = $('indMeasurementsEmpty');
    if (!tbody) return;

    if (!indMeasurements || !indMeasurements.length) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    tbody.innerHTML = indMeasurements.map((m, idx) => \`
      <tr style="border-bottom: 1px solid var(--comtur-border-light);">
        <td style="padding: 8px 10px;">
          <input type="text" class="comtur-input comtur-input-sm" style="font-size:0.84rem; padding:4px 8px; height:32px; width:100%;" placeholder="Ex.: Jan/2026" value="\${escapeHtml(m.period || '')}" onchange="updateIndMeasurementField(\${idx}, 'period', this.value)">
        </td>
        <td style="padding: 8px 10px;">
          <input type="date" class="comtur-input comtur-input-sm" style="font-size:0.84rem; padding:4px 8px; height:32px; width:100%;" value="\${escapeHtml(m.date || '')}" onchange="updateIndMeasurementField(\${idx}, 'date', this.value)">
        </td>
        <td style="padding: 8px 10px;">
          <input type="text" class="comtur-input comtur-input-sm" style="font-size:0.84rem; padding:4px 8px; height:32px; width:100%; font-weight:700;" placeholder="Ex.: 78,5" value="\${escapeHtml(m.value || '')}" onchange="updateIndMeasurementField(\${idx}, 'value', this.value)">
        </td>
        <td style="padding: 8px 10px;">
          <input type="text" class="comtur-input comtur-input-sm" style="font-size:0.84rem; padding:4px 8px; height:32px; width:100%;" placeholder="Opcional" value="\${escapeHtml(m.source || '')}" onchange="updateIndMeasurementField(\${idx}, 'source', this.value)">
        </td>
        <td style="padding: 8px 10px;">
          <input type="text" class="comtur-input comtur-input-sm" style="font-size:0.84rem; padding:4px 8px; height:32px; width:100%;" placeholder="Opcional" value="\${escapeHtml(m.notes || '')}" onchange="updateIndMeasurementField(\${idx}, 'notes', this.value)">
        </td>
        <td style="padding: 8px 10px; text-align: center;">
          <button type="button" class="comtur-btn comtur-btn-danger comtur-btn-xs" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;" onclick="removeIndMeasurement(\${idx})">✕</button>
        </td>
      </tr>
    \`).join('');
  }

  function updateIndMeasurementField(idx, field, val) {
    if (indMeasurements[idx]) {
      indMeasurements[idx][field] = val;
    }
  }

  function addIndMeasurement(data = {}) {
    indMeasurements.push({
      period: data.period || '',
      date: data.date || '',
      value: data.value || '',
      source: data.source || '',
      notes: data.notes || ''
    });
    renderIndMeasurements();
  }

  function removeIndMeasurement(idx) {
    indMeasurements.splice(idx, 1);
    renderIndMeasurements();
  }

  `;
content = content.substring(0, sHelp) + helpersNew + content.substring(eHelp);

// 3. Update resetForm for indicator
const sResetInd = content.indexOf("if (currentType === 'indicator') {", content.indexOf('function resetForm'));
const eResetInd = content.indexOf("if (clearSidebarActive)", sResetInd);
if (sResetInd === -1 || eResetInd === -1) {
  console.error('ERROR: resetForm indicator section not found');
  process.exit(1);
}
const resetIndNew = `if (currentType === 'indicator') {
      populateIndMetricSelect();
      if ($('indName')) {
        $('indName').value = '';
        delete $('indName').dataset.manual;
      }
      if ($('indSlug')) {
        $('indSlug').value = '';
        delete $('indSlug').dataset.manual;
      }
      if ($('indCategory')) {
        $('indCategory').value = 'Atrativos Turísticos';
        delete $('indCategory').dataset.manual;
      }
      if ($('indStatusSelect')) $('indStatusSelect').value = 'published';
      if ($('indDescription')) {
        $('indDescription').value = '';
        delete $('indDescription').dataset.manual;
      }
      if ($('indUnit')) $('indUnit').value = '';
      if ($('indPeriodicity')) $('indPeriodicity').value = 'Mensal';
      if ($('indSource')) $('indSource').value = '';
      if ($('indSourceUrl')) $('indSourceUrl').value = '';
      if ($('indVisType')) $('indVisType').value = 'card';
      if ($('indPublicTitle')) {
        $('indPublicTitle').value = '';
        delete $('indPublicTitle').dataset.manual;
      }
      if ($('indPublicDesc')) {
        $('indPublicDesc').value = '';
        delete $('indPublicDesc').dataset.manual;
      }
      if ($('indShowObservatory')) $('indShowObservatory').checked = true;
      if ($('indFeatured')) $('indFeatured').checked = false;
      indMeasurements = [];
      renderIndMeasurements();
      updateIndSourceTypeView('automatic');
      updateIndAutoPreview();
      if ($('btnArchiveInd')) $('btnArchiveInd').style.display = 'none';
    }

    `;
content = content.substring(0, sResetInd) + resetIndNew + content.substring(eResetInd);

// 4. Update loadItemForEdit indicator section
const sLoadInd = content.indexOf("item.type === 'indicator'", content.indexOf('function loadItemForEdit'));
const sLoadBlock = content.lastIndexOf('if (item.type === \'indicator\'', sLoadInd) !== -1 ? content.lastIndexOf('if (item.type === \'indicator\'', sLoadInd) : content.lastIndexOf('else if (item.type === \'indicator\'', sLoadInd);
const eLoadInd = content.indexOf('return;', sLoadInd) + 'return;\n    }'.length;

if (sLoadBlock === -1 || eLoadInd === -1) {
  console.error('ERROR: loadItemForEdit indicator section not found');
  process.exit(1);
}

const loadIndNew = `else if (item.type === 'indicator') {
      populateIndMetricSelect();
      const meta = item.metadata || {};
      if ($('indName')) {
        $('indName').value = item.title || meta.name || '';
        $('indName').dataset.manual = 'true';
      }
      if ($('indSlug')) {
        $('indSlug').value = item.slug || '';
        $('indSlug').dataset.manual = 'true';
      }
      if ($('indCategory')) {
        $('indCategory').value = meta.category || 'Atrativos Turísticos';
        $('indCategory').dataset.manual = 'true';
      }
      if ($('indStatusSelect')) $('indStatusSelect').value = item.status === 'published' ? 'published' : 'draft';
      if ($('indDescription')) {
        $('indDescription').value = meta.description || item.summary || item.body || '';
        $('indDescription').dataset.manual = 'true';
      }

      const sourceType = meta.sourceType || (meta.metricKey ? 'automatic' : 'manual');
      if ($('indMetricKey')) $('indMetricKey').value = meta.metricKey || 'attractions.total';
      if ($('indUnit')) $('indUnit').value = meta.unit || '';
      if ($('indPeriodicity')) $('indPeriodicity').value = meta.periodicity || 'Mensal';
      if ($('indSource')) $('indSource').value = meta.source || '';
      if ($('indSourceUrl')) $('indSourceUrl').value = meta.sourceUrl || '';
      if ($('indVisType')) $('indVisType').value = meta.visualizationType || 'card';
      if ($('indPublicTitle')) {
        $('indPublicTitle').value = meta.publicTitle || '';
        $('indPublicTitle').dataset.manual = 'true';
      }
      if ($('indPublicDesc')) {
        $('indPublicDesc').value = meta.publicDesc || '';
        $('indPublicDesc').dataset.manual = 'true';
      }
      if ($('indShowObservatory')) $('indShowObservatory').checked = meta.showObservatory !== false;
      if ($('indFeatured')) $('indFeatured').checked = item.featured === true || meta.featured === true;

      indMeasurements = Array.isArray(meta.measurements) ? [...meta.measurements] : [];
      renderIndMeasurements();
      updateIndSourceTypeView(sourceType);
      updateIndAutoPreview();

      if ($('btnArchiveInd')) $('btnArchiveInd').style.display = item.status !== 'archived' ? 'inline-block' : 'none';
      return;
    }`;

content = content.substring(0, sLoadBlock) + loadIndNew + content.substring(eLoadInd);

// 5. Update renderList empty state
const sRenderEmpty = content.indexOf('if (!filtered.length) {', content.indexOf('function renderList'));
const eRenderEmpty = content.indexOf('return;', sRenderEmpty) + 'return;\n    }'.length;
if (sRenderEmpty === -1 || eRenderEmpty === -1) {
  console.error('ERROR: renderList empty state not found');
  process.exit(1);
}
const renderEmptyNew = `if (!filtered.length) {
      if (currentType === 'indicator') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhum indicador encontrado.' : 'Nenhum indicador cadastrado.'}</div>\`;
      } else {
        const typeCfg = CONTENT_TYPES.find(c => c.id === currentType);
        const label = typeCfg ? typeCfg.label.toLowerCase() : 'item';
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? \`Nenhum \${label} encontrado.\` : \`Nenhum \${label} cadastrado.\`}</div>\`;
      }
      return;
    }`;
content = content.substring(0, sRenderEmpty) + renderEmptyNew + content.substring(eRenderEmpty);

// 6. Update loadItems error handling
const sLoadCatch = content.indexOf('} catch (err) {', content.indexOf('async function loadItems'));
const eLoadCatch = content.indexOf('window.loadItems = loadItems;', sLoadCatch);
if (sLoadCatch === -1 || eLoadCatch === -1) {
  console.error('ERROR: loadItems catch not found');
  process.exit(1);
}
const loadCatchNew = `} catch (err) {
      console.error('loadItems error:', err);
      if (listEl) {
        const typeCfg = CONTENT_TYPES.find(c => c.id === currentType);
        let errorMsg = 'Não foi possível carregar os itens.';
        if (currentType === 'indicator') {
          errorMsg = 'Não foi possível carregar os indicadores.';
        } else if (typeCfg) {
          errorMsg = \`Não foi possível carregar: \${typeCfg.listTitle.toLowerCase()}.\`;
        }
        listEl.innerHTML = \`
          <div class="comtur-empty" style="color:var(--comtur-danger); padding: 16px 12px; text-align: center;">
            <div style="margin-bottom: 8px; font-weight: 600;">\${escapeHtml(errorMsg)}</div>
            <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="loadItems()">🔄 Tentar novamente</button>
          </div>
        \`;
      }
    }
  }
  `;
content = content.substring(0, sLoadCatch) + loadCatchNew + content.substring(eLoadCatch);

// 7. Update metric change listener in init() to sync default category if not manual
const sMetricLis = content.indexOf("if ($('indMetricKey')) {", content.indexOf('function init'));
const eMetricLis = content.indexOf("document.querySelectorAll('input[name=\"indSourceTypeRadio\"]').forEach", sMetricLis);
if (sMetricLis === -1 || eMetricLis === -1) {
  console.error('ERROR: indMetricKey listener not found');
  process.exit(1);
}
const metricLisNew = `if ($('indMetricKey')) {
      $('indMetricKey').addEventListener('change', () => {
        updateIndAutoPreview();
        const key = $('indMetricKey').value;
        const cfg = AUTOMATIC_METRIC_CONFIGS.find(m => m.key === key);
        if (cfg && !$('id').value && $('indCategory') && !$('indCategory').dataset.manual) {
          $('indCategory').value = cfg.defaultCategory;
        }
      });
    }
    if ($('indCategory')) {
      $('indCategory').addEventListener('change', () => {
        $('indCategory').dataset.manual = 'true';
      });
    }
    `;
content = content.substring(0, sMetricLis) + metricLisNew + content.substring(eMetricLis);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully applied all Indicator fixes to comtur-content-admin.html!');
