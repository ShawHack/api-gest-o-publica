const cp = require('child_process');
const fs = require('fs');
const filePath = 'comtur-next/portal/comtur-content-admin.html';

// Read clean base directly from git HEAD
const base = cp.execSync('git show HEAD:comtur-next/portal/comtur-content-admin.html', { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');
let content = base;

// 1. Insert #indicatorFields right after accountabilityFields closing </div>
const formCloseMarker = '\n        </form>';
const formCloseIdx = content.indexOf(formCloseMarker);
if (formCloseIdx === -1) {
  console.error('ERROR: formCloseMarker not found');
  process.exit(1);
}

const indicatorFormHtml = `

          <!-- ================================================== -->
          <!-- 12. INDICATOR / OBSERVATÓRIO DO TURISMO FORM       -->
          <!-- ================================================== -->
          <div id="indicatorFields" class="comtur-category-fields" style="display:none">
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

            <!-- SEÇÃO 2: Origem do Dado -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num">2</span> Origem do Dado</div>
              <div class="comtur-field">
                <label style="margin-bottom: 8px; display: block;">Modo de alimentação da métrica <span class="req">*</span></label>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                  <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                    <input type="radio" name="indSourceTypeRadio" value="automatic" checked>
                    <span>⚡ Automático (calculado pelo sistema em tempo real)</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                    <input type="radio" name="indSourceTypeRadio" value="manual">
                    <span>📝 Manual / Externo (inserção de medições e séries temporais)</span>
                  </label>
                </div>
              </div>

              <!-- Sub-painel: AUTOMÁTICO -->
              <div id="indSourceAutoPanel" style="margin-top: 12px; border-left: 4px solid var(--comtur-primary); padding-left: 16px;">
                <div class="comtur-field">
                  <label for="indMetricKey">Métrica do sistema associada <span class="req">*</span></label>
                  <select id="indMetricKey" class="comtur-select">
                    <!-- Preenchido dinamicamente com as 9 métricas oficiais -->
                  </select>
                  <p class="comtur-hint" style="margin-top: 6px;">Esta métrica é computada automaticamente consultando os dados publicados na base do sistema.</p>
                </div>

                <!-- Preview do cálculo em tempo real -->
                <div id="indAutoPreviewCard" style="margin-top: 12px; background: #f8fafc; border: 1px solid var(--comtur-border-light); border-radius: var(--comtur-radius-md); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--comtur-text-muted); font-weight: 700;">Valor apurado em tempo real</div>
                    <div id="indAutoMetricLabel" style="font-size: 0.95rem; font-weight: 700; color: var(--comtur-primary-dark); margin-top: 2px;">Total de atrativos turísticos</div>
                  </div>
                  <div style="text-align: right;">
                    <div id="indAutoMetricValue" style="font-size: 2rem; font-weight: 900; color: var(--comtur-primary); line-height: 1;">0</div>
                    <div id="indAutoMetricUnit" style="font-size: 0.8rem; color: var(--comtur-text-muted); font-weight: 600;">atrativos ativos</div>
                  </div>
                </div>
              </div>

              <!-- Sub-painel: MANUAL / EXTERNO -->
              <div id="indSourceManualPanel" style="display: none; border-left: 4px solid #d97706; padding-left: 16px; margin-top: 12px;">
                <div class="comtur-grid-2">
                  <div class="comtur-field">
                    <label for="indUnit">Unidade de medida <span class="req">*</span></label>
                    <input id="indUnit" class="comtur-input" placeholder="Ex.: %, R$, dias, turistas, vagas">
                  </div>
                  <div class="comtur-field">
                    <label for="indPeriodicity">Periodicidade de atualização <span class="req">*</span></label>
                    <select id="indPeriodicity" class="comtur-select">
                      <option value="Mensal" selected>Mensal</option>
                      <option value="Bimestral">Bimestral</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Pontual / Por Temporada">Pontual / Por Temporada</option>
                    </select>
                  </div>
                  <div class="comtur-field">
                    <label for="indSource">Fonte do dado <span class="req">*</span></label>
                    <input id="indSource" class="comtur-input" placeholder="Ex.: Pesquisa Direta COMTUR, ABIH, IBGE, Cadastur">
                  </div>
                  <div class="comtur-field">
                    <label for="indSourceUrl">Link da fonte / estudo (opcional)</label>
                    <input id="indSourceUrl" type="url" class="comtur-input" placeholder="https://...">
                  </div>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 3: Série Histórica / Medições (Manual) -->
            <div id="indHistorySection" class="comtur-section" style="display: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div class="comtur-section-title" style="margin-bottom: 0;"><span class="num">3</span> Série Histórica & Medições</div>
                <button type="button" class="comtur-btn comtur-btn-primary comtur-btn-sm" onclick="addIndMeasurement()">+ Adicionar Medição</button>
              </div>
              <p class="comtur-hint" style="margin-bottom: 14px;">Insira os valores coletados ao longo do tempo para compor a série histórica e gráficos do Observatório.</p>
              
              <div style="overflow-x: auto; border: 1px solid var(--comtur-border-light); border-radius: var(--comtur-radius-md);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                  <thead>
                    <tr style="background: #f8fafc; border-bottom: 1px solid var(--comtur-border-light); text-align: left;">
                      <th style="padding: 10px 12px; font-weight: 700; color: var(--comtur-primary-dark); width: 22%;">Período *</th>
                      <th style="padding: 10px 12px; font-weight: 700; color: var(--comtur-primary-dark); width: 18%;">Data Ref.</th>
                      <th style="padding: 10px 12px; font-weight: 700; color: var(--comtur-primary-dark); width: 20%;">Valor *</th>
                      <th style="padding: 10px 12px; font-weight: 700; color: var(--comtur-primary-dark); width: 20%;">Fonte específica</th>
                      <th style="padding: 10px 12px; font-weight: 700; color: var(--comtur-primary-dark); width: 20%;">Observações</th>
                      <th style="padding: 10px 12px; text-align: center; width: 40px;"></th>
                    </tr>
                  </thead>
                  <tbody id="indMeasurementsTableBody">
                    <!-- Linhas dinâmicas -->
                  </tbody>
                </table>
              </div>
              <div id="indMeasurementsEmpty" style="display: none; padding: 20px; text-align: center; color: var(--comtur-text-muted); font-size: 0.88rem; background: #f8fafc;">
                Nenhuma medição adicionada ainda. Clique em <strong>+ Adicionar Medição</strong> acima.
              </div>
            </div>

            <!-- SEÇÃO 4: Visualização no Observatório -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num" id="indSectionNumVis">3</span> Visualização no Observatório</div>
              <div class="comtur-grid-2">
                <div class="comtur-field">
                  <label for="indVisType">Formato preferencial de exibição <span class="req">*</span></label>
                  <select id="indVisType" class="comtur-select">
                    <option value="card" selected>🃏 Card com Destaque Numérico (KPI)</option>
                    <option value="line_chart">📈 Gráfico de Linha (Evolução Temporal)</option>
                    <option value="bar_chart">📊 Gráfico de Barras</option>
                    <option value="percentage">🎯 Indicador Percentual (%)</option>
                    <option value="history_table">📋 Tabela de Série Histórica</option>
                  </select>
                </div>
                <div class="comtur-field">
                  <label for="indPublicTitle">Título público no Observatório</label>
                  <input id="indPublicTitle" class="comtur-input" placeholder="Ex.: Total de atrativos turísticos (deixe vazio para usar o nome)">
                </div>
                <div class="comtur-field comtur-grid-full">
                  <label for="indPublicDesc">Texto explicativo público</label>
                  <input id="indPublicDesc" class="comtur-input" placeholder="Ex.: Total de atrativos e pontos turísticos publicados no portal.">
                </div>
                <div class="comtur-field comtur-grid-full" style="display: flex; gap: 24px; flex-wrap: wrap; margin-top: 6px;">
                  <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                    <input id="indShowObservatory" type="checkbox" checked>
                    <span>Exibir no Observatório do Turismo público</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
                    <input id="indFeatured" type="checkbox">
                    <span>Destacar no topo da página de Indicadores</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- SEÇÃO 5: Ações -->
            <div class="comtur-section">
              <div class="comtur-section-title"><span class="num" id="indSectionNumActions">4</span> Ações</div>
              <div class="comtur-actions-bar">
                <div class="comtur-actions-group">
                  <button type="button" class="comtur-btn comtur-btn-success" onclick="saveContent('published')">💾 Salvar Indicador</button>
                  <button type="button" class="comtur-btn comtur-btn-secondary" onclick="saveContent('draft')">Salvar como Inativo / Rascunho</button>
                </div>
                <div class="comtur-actions-group">
                  <button id="btnArchiveInd" type="button" class="comtur-btn comtur-btn-danger" style="display:none;" onclick="saveContent('archived')">📦 Desativar Indicador</button>
                </div>
              </div>
            </div>

          </div>`;

content = content.substring(0, formCloseIdx) + indicatorFormHtml + content.substring(formCloseIdx);

// 2. Add state variable
content = content.replace('let accPdfFile = null;', 'let accPdfFile = null;\n  let indMeasurements = [];');

// 3. Add indicator helpers
const helpersCode = `  // --- INDICATOR CONSTANTS & HELPERS ---
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

const ctSwitchMarker = '// --- CONTENT TYPE SWITCHING & FORM REGISTRY ---';
content = content.replace(ctSwitchMarker, helpersCode + '\n  ' + ctSwitchMarker);

// 4. Update specializedMap
content = content.replace(
  "'accountability': 'accountabilityFields'",
  "'accountability': 'accountabilityFields',\n      'indicator': 'indicatorFields'"
);

// 5. Update resetForm
const resetAccEnd = "if (clearSidebarActive)";
const resetIndCode = `if (currentType === 'indicator') {
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

const resetTarget = content.indexOf(resetAccEnd, content.indexOf('function resetForm'));
content = content.substring(0, resetTarget) + resetIndCode + content.substring(resetTarget);

// 6. Update renderList
content = content.replace(
  `if (!filtered.length) {
      listEl.innerHTML = \`<div class="comtur-empty">Nenhum item encontrado.</div>\`;
      return;
    }`,
  `if (!filtered.length) {
      if (currentType === 'indicator') {
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? 'Nenhum indicador encontrado.' : 'Nenhum indicador cadastrado.'}</div>\`;
      } else {
        const typeCfg = CONTENT_TYPES.find(c => c.id === currentType);
        const label = typeCfg ? typeCfg.label.toLowerCase() : 'item';
        listEl.innerHTML = \`<div class="comtur-empty">\${query ? \`Nenhum \${label} encontrado.\` : \`Nenhum \${label} cadastrado.\`}</div>\`;
      }
      return;
    }`
);

const indCardCode = `// 5. Indicator Card (Observatório & Estatísticas)
      if (item.type === 'indicator') {
        const meta = item.metadata || {};
        const isAuto = (meta.sourceType === 'automatic') || (!meta.sourceType && !!meta.metricKey);
        const categoryVal = meta.category || 'Geral';
        let detailVal = '';
        if (isAuto) {
          const cfg = AUTOMATIC_METRIC_CONFIGS.find(m => m.key === meta.metricKey);
          const currentVal = calculateSystemMetric(meta.metricKey, allItems);
          const unitStr = cfg ? cfg.unit : (meta.unit || '');
          detailVal = \`AUTOMÁTICO • \${currentVal} \${unitStr}\`;
        } else {
          const meas = Array.isArray(meta.measurements) ? meta.measurements : [];
          const count = meas.length;
          const unitStr = meta.unit || '';
          if (count > 0) {
            const latest = meas[meas.length - 1];
            detailVal = \`MANUAL • \${latest.value} \${unitStr} (\${count} med.)\`;
          } else {
            detailVal = \`MANUAL • \${unitStr || 'sem medições'}\`;
          }
        }

        return \`
          <button class="comtur-list-item \${isActive ? 'is-active' : ''}" type="button" data-id="\${item._id}" style="padding: 10px 12px; width: 100%; text-align: left;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 36px; height: 36px; border-radius: var(--comtur-radius-md); background: \${isAuto ? '#f0fdf4' : '#fffbeb'}; color: \${isAuto ? '#16a34a' : '#d97706'}; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; font-weight: 800;">
                📈
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="comtur-list-title" style="font-weight: 700; font-size: 0.92rem; margin-bottom: 2px; color: var(--comtur-primary-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  \${escapeHtml(item.title || 'Sem título')}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; font-size: 0.78rem; color: var(--comtur-text-muted); line-height: 1.2;">
                  <span style="font-weight: 700; color: var(--comtur-primary);">\${escapeHtml(categoryVal)}</span>
                  <span>• \${escapeHtml(detailVal)}</span>
                </div>
              </div>
            </div>
            <div class="comtur-list-meta" style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span class="comtur-badge \${statusClass}">\${statusLabel}</span>
              <span style="font-size: 0.72rem; font-weight: 600; color: \${isAuto ? '#16a34a' : '#d97706'};">\${isAuto ? '⚡ AUTOMÁTICO' : '📝 MANUAL'}</span>
            </div>
          </button>
        \`;
      }

      // 6. Default Standard Card`;

content = content.replace('// 5. Default Standard Card', indCardCode);

// 7. Update loadItemForEdit
const loadStdMarker = "} else {\n      // Standard / Default\n      if ($('stdTitle')) $('stdTitle').value = item.title || '';";
const loadIndCode = `} else if (item.type === 'indicator') {
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

      if ($('btnArchiveInd')) $('btnArchiveInd').style.display = item.status === 'archived' ? 'none' : 'inline-flex';
    `;

content = content.replace(loadStdMarker, loadIndCode + loadStdMarker);

// 8. Update buildPayload
const bpStdMarker = "// Default / Standard\n    const name = $('stdTitle').value.trim();";
const bpIndCode = `if (currentType === 'indicator') {
      const name = $('indName').value.trim();
      if (!name) {
        showNotice('O nome do indicador é obrigatório.', true);
        return null;
      }
      const slug = slugify($('indSlug').value) || slugify(name);
      const category = $('indCategory').value;
      const description = $('indDescription').value.trim();
      const selectedSourceType = document.querySelector('input[name="indSourceTypeRadio"]:checked')?.value || 'automatic';
      const metricKey = selectedSourceType === 'automatic' ? $('indMetricKey').value : undefined;
      const cfg = AUTOMATIC_METRIC_CONFIGS.find(m => m.key === metricKey);
      const unit = selectedSourceType === 'manual' ? $('indUnit').value.trim() : (cfg?.unit || '');
      const periodicity = selectedSourceType === 'manual' ? $('indPeriodicity').value : undefined;
      const source = selectedSourceType === 'manual' ? $('indSource').value.trim() : 'Sistema COMTUR (Cálculo Automático)';
      const sourceUrl = selectedSourceType === 'manual' ? $('indSourceUrl').value.trim() : undefined;
      const visualizationType = $('indVisType').value;
      const publicTitle = $('indPublicTitle').value.trim() || name;
      const publicDesc = $('indPublicDesc').value.trim() || description;
      const showObservatory = $('indShowObservatory').checked;
      const featured = $('indFeatured').checked;
      const status = statusToSave || $('indStatusSelect').value || 'published';
      const publishedAt = status === 'published' ? new Date().toISOString() : undefined;

      return {
        type: 'indicator',
        title: name,
        slug,
        summary: description,
        body: description,
        featured,
        status,
        publishedAt,
        metadata: {
          name,
          category,
          description,
          sourceType: selectedSourceType,
          metricKey,
          unit,
          periodicity,
          source,
          sourceUrl,
          visualizationType,
          publicTitle,
          publicDesc,
          showObservatory,
          featured,
          measurements: indMeasurements
        }
      };
    }

    `;

content = content.replace(bpStdMarker, bpIndCode + bpStdMarker);

// 9. Update loadItems error handling
content = content.replace(
  `    } catch (err) {
      console.error('loadItems error:', err);
      if (listEl) {
        listEl.innerHTML = \`
          <div class="comtur-empty" style="color:var(--comtur-danger); padding: 16px 12px; text-align: center;">
            <div style="margin-bottom: 8px; font-weight: 600;">Não foi possível carregar os documentos.</div>
            <button type="button" class="comtur-btn comtur-btn-secondary comtur-btn-sm" onclick="loadItems()">🔄 Tentar novamente</button>
          </div>
        \`;
      }
    }`,
  `    } catch (err) {
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
    }`
);

// 10. Update init() listeners
const initStdMarker = "// 12. Standard / Global Listeners";
const initIndCode = `// 12. Indicator Listeners (Observatório & Estatísticas)
    if ($('indName')) {
      $('indName').addEventListener('input', () => {
        $('indName').dataset.manual = 'true';
        if (!$('id').value && $('indSlug') && !$('indSlug').dataset.manual) {
          $('indSlug').value = slugify($('indName').value);
        }
      });
    }
    if ($('indPublicTitle')) {
      $('indPublicTitle').addEventListener('input', () => {
        $('indPublicTitle').dataset.manual = 'true';
      });
    }
    if ($('indPublicDesc')) {
      $('indPublicDesc').addEventListener('input', () => {
        $('indPublicDesc').dataset.manual = 'true';
      });
    }
    if ($('indDescription')) {
      $('indDescription').addEventListener('input', () => {
        $('indDescription').dataset.manual = 'true';
      });
    }
    if ($('indMetricKey')) {
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
    document.querySelectorAll('input[name="indSourceTypeRadio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        updateIndSourceTypeView(e.target.value);
      });
    });

    // 13. Standard / Global Listeners`;

content = content.replace(initStdMarker, initIndCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Clean build of comtur-content-admin.html with Indicator module complete!');
