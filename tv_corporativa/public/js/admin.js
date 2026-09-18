/**
 * ADMIN STUDIO & MULTI-DISPLAY SETTINGS LOGIC - SEMIT TV
 */

let currentAdminDisplay = new URLSearchParams(window.location.search).get('display') || 'default';
let syncPollingTimer = null;
let allLoadedDisplays = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadDisplaysList();
    await loadSettings();
    await checkXiboStatus();
    await loadPlaylistItems();
    updateDirectUrlDisplay();
    startSyncStatusPolling();

    // Seletor de Display em Edição
    const displaySelect = document.getElementById('activeDisplaySelect');
    if (displaySelect) {
        displaySelect.value = currentAdminDisplay;
        displaySelect.addEventListener('change', async (e) => {
            selectDisplayForEdit(e.target.value);
        });
    }

    // Botão Atualizar Tabela de Displays
    const btnRefreshTable = document.getElementById('btn-refresh-displays-table');
    if (btnRefreshTable) {
        btnRefreshTable.addEventListener('click', async () => {
            await loadDisplaysList();
        });
    }

    // Modal: Abrir/Fechar Novo Player
    const btnOpenModal = document.getElementById('btn-open-new-display-modal');
    const modal = document.getElementById('new-display-modal');
    const btnCloseModal = document.getElementById('btn-close-new-display-modal');
    const btnCancelModal = document.getElementById('btn-cancel-new-display');
    const btnSubmitModal = document.getElementById('btn-submit-new-display');
    const modalDisplayName = document.getElementById('modalDisplayName');
    const modalDisplayId = document.getElementById('modalDisplayId');

    if (btnOpenModal && modal) {
        btnOpenModal.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (modalDisplayName) {
                modalDisplayName.value = '';
                modalDisplayName.focus();
            }
            if (modalDisplayId) modalDisplayId.value = '';
        });
    }

    if (modalDisplayName && modalDisplayId) {
        modalDisplayName.addEventListener('input', (e) => {
            const slug = e.target.value.toLowerCase().trim()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9_-]/g, '_');
            modalDisplayId.value = slug;
        });
    }

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    if (btnSubmitModal) {
        btnSubmitModal.addEventListener('click', async () => {
            const name = modalDisplayName ? modalDisplayName.value.trim() : '';
            let slug = modalDisplayId ? modalDisplayId.value.trim() : '';
            const orientation = document.getElementById('modalOrientation')?.value || 'landscape';
            const activeLayout = document.getElementById('modalLayout')?.value || '3-zone-corporate';

            if (!name) {
                alert('Por favor, informe um nome para o Display (Ex: Totem Recepção).');
                return;
            }

            if (!slug) {
                slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            }

            btnSubmitModal.disabled = true;
            btnSubmitModal.textContent = 'Criando...';

            try {
                const res = await fetch('api/displays', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, id: slug, orientation, activeLayout })
                });
                const data = await res.json();
                if (data.success) {
                    closeModal();
                    await loadDisplaysList();
                    selectDisplayForEdit(slug);
                    alert(`✅ Player "${name}" criado com sucesso! Link direto pronto para exibição.`);
                } else {
                    alert('Erro ao criar player: ' + (data.error || 'Erro desconhecido'));
                }
            } catch (e) {
                alert('Erro na requisição: ' + e.message);
            } finally {
                btnSubmitModal.disabled = false;
                btnSubmitModal.textContent = '🚀 Criar e Ativar Player';
            }
        });
    }

    // Copiar Link Direto da TV Selecionada
    const btnCopyUrl = document.getElementById('btn-copy-display-url');
    if (btnCopyUrl) {
        btnCopyUrl.addEventListener('click', () => {
            const urlText = document.getElementById('display-direct-url').textContent;
            navigator.clipboard.writeText(urlText).then(() => {
                const orig = btnCopyUrl.innerHTML;
                btnCopyUrl.innerHTML = '✅ Copiado!';
                setTimeout(() => { btnCopyUrl.innerHTML = orig; }, 2000);
            });
        });
    }

    // Salvar configurações gerais
    const btnSaveTop = document.getElementById('btn-save-top-config');
    if (btnSaveTop) {
        btnSaveTop.addEventListener('click', async () => {
            await saveSettings(btnSaveTop);
        });
    }

    const btnSaveBottom = document.getElementById('btn-save-bottom-config');
    if (btnSaveBottom) {
        btnSaveBottom.addEventListener('click', async () => {
            await saveSettings(btnSaveBottom);
        });
    }

    // Registrar no Xibo
    const btnRegister = document.getElementById('btn-register-xibo');
    if (btnRegister) {
        btnRegister.addEventListener('click', async () => {
            await registerWithXibo();
        });
    }

    // Forçar Sincronização Agora
    const btnForceSync = document.getElementById('btn-force-sync-now');
    if (btnForceSync) {
        btnForceSync.addEventListener('click', async () => {
            await triggerSyncForDisplay(currentAdminDisplay, btnForceSync);
        });
    }

    // Aplicar Formato de Layout e Orientação
    const btnApplyLayout = document.getElementById('btn-apply-layout-mode');
    if (btnApplyLayout) {
        btnApplyLayout.addEventListener('click', async () => {
            await saveLayoutFormat();
        });
    }

    // Botão Pausar / Retomar Preview
    const btnPreviewPause = document.getElementById('btn-preview-pause');
    let isPreviewPaused = false;

    if (btnPreviewPause) {
        btnPreviewPause.addEventListener('click', () => {
            isPreviewPaused = !isPreviewPaused;
            btnPreviewPause.textContent = isPreviewPaused ? '▶️ Retomar' : '⏸️ Pausar';
            btnPreviewPause.style.borderColor = isPreviewPaused ? 'var(--amber)' : '';
            btnPreviewPause.style.color = isPreviewPaused ? 'var(--amber)' : '';

            const iframe = document.getElementById('preview-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ action: 'togglePause', paused: isPreviewPaused }, '*');
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const video = doc.querySelector('video');
                    if (video) {
                        if (isPreviewPaused) {
                            video.pause();
                        } else {
                            video.play().catch(() => {});
                        }
                    }
                } catch (e) {}
            }
        });
    }

    // Botão Recarregar Preview
    const btnPreviewRefresh = document.getElementById('btn-preview-refresh');
    if (btnPreviewRefresh) {
        btnPreviewRefresh.addEventListener('click', () => {
            refreshPreview();
        });
    }

    // Botões de Preview de Proporção (16:9 vs 9:16)
    const btnPrev169 = document.getElementById('btn-preview-16-9');
    const btnPrev916 = document.getElementById('btn-preview-9-16');
    const previewContainer = document.getElementById('preview-frame-container');
    const previewIframe = document.getElementById('preview-iframe');

    if (btnPrev169 && btnPrev916 && previewContainer && previewIframe) {
        btnPrev169.addEventListener('click', () => {
            previewContainer.style.height = '230px';
            previewIframe.style.width = '100%';
            previewIframe.style.height = '100%';
            btnPrev169.style.background = 'var(--accent-blue)';
            btnPrev916.style.background = '';
        });

        btnPrev916.addEventListener('click', () => {
            previewContainer.style.height = '340px';
            previewIframe.style.width = '190px';
            previewIframe.style.height = '338px';
            btnPrev916.style.background = 'var(--accent-blue)';
            btnPrev169.style.background = '';
        });
    }

    // Adicionar slide na grade
    const btnAddSlide = document.getElementById('btn-add-slide');
    if (btnAddSlide) {
        btnAddSlide.addEventListener('click', async () => {
            await addNewSlide();
        });
    }

    // Disparar Alerta de Emergência
    const btnTriggerAlert = document.getElementById('btn-trigger-alert');
    if (btnTriggerAlert) {
        btnTriggerAlert.addEventListener('click', async () => {
            await toggleEmergencyAlert(true);
        });
    }

    const btnClearAlert = document.getElementById('btn-clear-alert');
    if (btnClearAlert) {
        btnClearAlert.addEventListener('click', async () => {
            await toggleEmergencyAlert(false);
        });
    }
});

function updateDirectUrlDisplay() {
    const urlEl = document.getElementById('display-direct-url');
    const linkEl = document.getElementById('link-open-display-url');
    const targetNameEl = document.getElementById('monitor-target-display-name');
    const topPlayerLink = document.getElementById('link-open-main-player');

    const baseOrigin = window.location.origin;
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const basePath = isLocal ? '' : '/tv';
    
    const query = currentAdminDisplay === 'default' ? '' : `?display=${currentAdminDisplay}`;
    const fullUrl = `${baseOrigin}${basePath}/${query}`;
    const relativeUrl = `./${query}`;

    if (urlEl) urlEl.textContent = fullUrl;
    if (linkEl) linkEl.href = relativeUrl;

    const currentDisplayObj = allLoadedDisplays.find(d => d.id === currentAdminDisplay) || { displayName: currentAdminDisplay === 'default' ? 'Protótipo 01' : currentAdminDisplay };
    if (targetNameEl) {
        targetNameEl.textContent = currentDisplayObj.displayName || (currentAdminDisplay === 'default' ? 'Protótipo 01' : currentAdminDisplay);
    }

    if (topPlayerLink) {
        topPlayerLink.href = relativeUrl;
        topPlayerLink.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Abrir ${currentDisplayObj.displayName || 'Player'} (Fullscreen)
        `;
    }
}

async function loadDisplaysList() {
    const select = document.getElementById('activeDisplaySelect');
    const tbody = document.getElementById('displays-table-body');
    const cardsGrid = document.getElementById('displays-cards-grid');
    const monitorTabs = document.getElementById('monitor-display-tabs');

    try {
        const res = await fetch('api/displays');
        const displays = await res.json();
        allLoadedDisplays = displays;

        updateDirectUrlDisplay();

        // 1. Atualizar Dropdown
        if (select) {
            select.innerHTML = displays.map(d => {
                const label = d.id === 'default'
                    ? `📺 ${d.displayName || 'Protótipo 01 (Principal)'}`
                    : `📺 ${d.displayName || d.id}`;
                return `<option value="${d.id}" ${d.id === currentAdminDisplay ? 'selected' : ''}>${label}</option>`;
            }).join('');
        }

        // 2. Abas Rápidas no Monitor de Sincronização
        if (monitorTabs) {
            monitorTabs.innerHTML = displays.map(d => {
                const isSelected = d.id === currentAdminDisplay;
                return `
                    <button type="button" onclick="selectDisplayForEdit('${d.id}')" style="
                        padding: 6px 14px;
                        font-size: 0.85rem;
                        font-weight: 700;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: 1px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.1)'};
                        background: ${isSelected ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.05)'};
                        color: ${isSelected ? '#ffffff' : '#94a3b8'};
                        box-shadow: ${isSelected ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none'};
                    ">
                        ${d.orientation === 'portrait' ? '📱' : '📺'} ${escapeHtml(d.displayName)}
                        ${isSelected ? ' <span style="font-size: 0.7rem; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; margin-left: 4px;">ATIVO</span>' : ''}
                    </button>
                `;
            }).join('');
        }

        // 3. Grid de Cards Interativos de Displays
        if (cardsGrid) {
            const baseOrigin = window.location.origin;
            const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            const basePath = isLocal ? '' : '/tv';

            cardsGrid.innerHTML = displays.map(d => {
                const isSelected = d.id === currentAdminDisplay;
                const query = d.id === 'default' ? '' : `?display=${d.id}`;
                const playerFullUrl = `${baseOrigin}${basePath}/${query}`;
                const playerRelativeUrl = `./${query}`;
                const isPortrait = d.orientation === 'portrait';

                return `
                    <div style="
                        background: ${isSelected ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(15, 23, 42, 0.95))' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))'};
                        border: 1.5px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'};
                        border-radius: 12px;
                        padding: 16px;
                        cursor: pointer;
                        transition: all 0.25s ease-in-out;
                        box-shadow: ${isSelected ? '0 0 20px rgba(59, 130, 246, 0.35)' : '0 4px 12px rgba(0, 0, 0, 0.3)'};
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    " onclick="selectDisplayForEdit('${d.id}')">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="font-size: 1.8rem; background: rgba(59, 130, 246, 0.15); padding: 8px; border-radius: 10px;">
                                        ${isPortrait ? '📱' : '📺'}
                                    </div>
                                    <div>
                                        <div style="font-size: 1.05rem; font-weight: 800; color: #ffffff;">
                                            ${escapeHtml(d.displayName)}
                                        </div>
                                        <div style="font-size: 0.78rem; color: #94a3b8; font-family: monospace;">
                                            ID: ${d.id} • ${isPortrait ? 'Vertical 9:16' : 'Horizontal 16:9'}
                                        </div>
                                    </div>
                                </div>
                                ${isSelected ? '<span class="badge badge-primary" style="font-weight: 800; font-size: 0.75rem;">SELECIONADO</span>' : '<span class="badge" style="background: rgba(255,255,255,0.08); color: #94a3b8; font-size: 0.7rem;">CLIQUE P/ ATIVAR</span>'}
                            </div>

                            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
                                <span class="badge badge-emerald" style="font-size: 0.75rem;">
                                    🎬 ${d.cachedMediaCount || d.playlistCount || 0} mídias ativas
                                </span>
                                <span class="badge" style="background: rgba(255,255,255,0.07); color: #cbd5e1; font-size: 0.75rem;">
                                    Chave: <code>${escapeHtml(d.hardwareKey || 'Auto')}</code>
                                </span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;" onclick="event.stopPropagation();">
                            <a href="${playerRelativeUrl}" target="_blank" class="btn btn-primary" style="flex: 1; text-align: center; text-decoration: none; padding: 7px 12px; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                                ▶️ Abrir TV
                            </a>
                            <button type="button" class="btn btn-secondary" onclick="copyText('${playerFullUrl}', this)" style="padding: 7px 12px; font-size: 0.82rem;" title="Copiar Link">
                                📋 Link
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="triggerSyncForDisplay('${d.id}', this)" style="padding: 7px 12px; font-size: 0.82rem;" title="Sincronizar Agora">
                                🔄 Sync
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 4. Atualizar Tabela Visual de Displays
        if (tbody) {
            if (displays.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum display encontrado.</td></tr>`;
                return;
            }

            const baseOrigin = window.location.origin;
            const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            const basePath = isLocal ? '' : '/tv';

            tbody.innerHTML = displays.map(d => {
                const isSelected = d.id === currentAdminDisplay;
                const query = d.id === 'default' ? '' : `?display=${d.id}`;
                const playerFullUrl = `${baseOrigin}${basePath}/${query}`;
                const playerRelativeUrl = `./${query}`;
                const isPortrait = d.orientation === 'portrait';
                const timeAgo = formatRelativeTime(d.lastSync);

                const statusBadge = d.syncStatus === 'syncing'
                    ? `<span class="badge badge-primary"><span class="sync-spinner">🔄</span> Sincronizando</span>`
                    : (d.syncStatus === 'error'
                        ? `<span class="badge badge-amber">⚠️ Verificar Xibo</span>`
                        : `<span class="badge badge-emerald"><span class="pulse-dot"></span> Sincronizado</span>`);

                const deleteBtn = d.id === 'default'
                    ? `<button type="button" class="btn-icon-action btn-icon-delete" style="opacity: 0.35; cursor: not-allowed;" title="O display principal não pode ser removido">🗑️</button>`
                    : `<button type="button" class="btn-icon-action btn-icon-delete" onclick="deleteDisplay('${d.id}', '${escapeHtml(d.displayName)}')" title="Excluir este Display">🗑️</button>`;

                return `
                    <tr class="${isSelected ? 'active-row' : ''}" onclick="selectDisplayForEdit('${d.id}')" style="cursor: pointer;">
                        <td>
                            <div class="display-name-cell">
                                <span style="font-size: 1.1rem;">${isPortrait ? '📱' : '📺'}</span>
                                <div>
                                    <strong style="color: ${isSelected ? '#60a5fa' : '#fff'};">${escapeHtml(d.displayName)}</strong>
                                    ${d.id === 'default' ? '<span class="badge badge-primary" style="font-size: 0.65rem; margin-left: 4px;">PRINCIPAL</span>' : ''}
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Slug: <code>${d.id}</code></div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="hw-key-tag" title="Chave única no Xibo CMS">${escapeHtml(d.hardwareKey || 'Auto')}</span>
                        </td>
                        <td>
                            <span style="font-size: 0.82rem; font-weight: 600;">
                                ${isPortrait ? '📱 Vertical 9:16 (Totem)' : '📺 Horizontal 16:9 (TV)'}
                            </span>
                        </td>
                        <td>
                            ${statusBadge}
                        </td>
                        <td>
                            <span style="font-size: 0.85rem; font-weight: 700; color: #34d399;">
                                🎬 ${d.cachedMediaCount || d.playlistCount || 0} mídias
                            </span>
                        </td>
                        <td>
                            <span style="font-size: 0.8rem; color: var(--text-muted);" title="${d.lastSync || ''}">
                                ⏱️ ${timeAgo}
                            </span>
                        </td>
                        <td onclick="event.stopPropagation();">
                            <div class="action-btns">
                                <a href="${playerRelativeUrl}" target="_blank" class="btn-icon-action btn-icon-open" title="Abrir Player em Tela Cheia">
                                    ▶️ Abrir
                                </a>
                                <button type="button" class="btn-icon-action btn-icon-copy" onclick="copyText('${playerFullUrl}', this)" title="Copiar Link Direto deste Player">
                                    📋 Link
                                </button>
                                <button type="button" class="btn-icon-action btn-icon-sync" onclick="triggerSyncForDisplay('${d.id}', this)" title="Sincronizar Mídias do Xibo Agora">
                                    🔄 Sync
                                </button>
                                <button type="button" class="btn-icon-action btn-icon-edit" onclick="selectDisplayForEdit('${d.id}')" title="Configurar Parâmetros desta TV">
                                    ⚙️ Editar
                                </button>
                                ${deleteBtn}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.warn('Erro ao listar displays:', e);
    }
}

window.selectDisplayForEdit = async function(displayId) {
    currentAdminDisplay = displayId;
    updateDirectUrlDisplay();
    await loadDisplaysList();
    await loadSettings();
    await checkXiboStatus();
    await loadPlaylistItems();
    await updateSyncMonitorData();
    refreshPreview();
};

window.copyText = function(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        if (btnElement) {
            const original = btnElement.innerHTML;
            btnElement.innerHTML = '✅ Copiado!';
            setTimeout(() => { btnElement.innerHTML = original; }, 2000);
        }
    });
};

window.triggerSyncForDisplay = async function(displayId, btnElement) {
    let originalText = '';
    if (btnElement) {
        originalText = btnElement.innerHTML;
        btnElement.innerHTML = '⏳ Sincronizando...';
        btnElement.disabled = true;
    }

    try {
        const res = await fetch(`api/xibo/sync-now?display=${displayId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayId })
        });
        const data = await res.json();
        if (data.success) {
            await updateSyncMonitorData();
            setTimeout(async () => {
                await updateSyncMonitorData();
                await loadDisplaysList();
                await loadPlaylistItems();
                refreshPreview();
            }, 3000);
        }
    } catch (e) {
        alert('Erro ao acionar sincronização: ' + e.message);
    } finally {
        if (btnElement) {
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    }
};

window.deleteDisplay = async function(displayId, displayName) {
    if (!confirm(`Deseja realmente excluir o player "${displayName || displayId}"? Os arquivos de configuração serão removidos.`)) {
        return;
    }

    try {
        const res = await fetch(`api/displays/${displayId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            if (currentAdminDisplay === displayId) {
                currentAdminDisplay = 'default';
            }
            await loadDisplaysList();
            await selectDisplayForEdit(currentAdminDisplay);
            alert(`Player excluído com sucesso!`);
        } else {
            alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (e) {
        alert('Erro na requisição: ' + e.message);
    }
};

/**
 * Polling em tempo real da sincronização do Xibo
 */
function startSyncStatusPolling() {
    if (syncPollingTimer) clearInterval(syncPollingTimer);
    updateSyncMonitorData();
    syncPollingTimer = setInterval(updateSyncMonitorData, 3500);
}

async function updateSyncMonitorData() {
    try {
        const res = await fetch(`api/xibo/sync-status?display=${currentAdminDisplay}`);
        const data = await res.json();

        // 1. Indicador de Status
        const statusIndicator = document.getElementById('sync-status-indicator');
        if (statusIndicator) {
            if (data.status === 'syncing') {
                statusIndicator.innerHTML = `<span class="badge badge-primary"><span class="sync-spinner">🔄</span> Baixando (${data.progress || 0}%)</span>`;
            } else if (data.status === 'error') {
                statusIndicator.innerHTML = `<span class="badge badge-amber">⚠️ Atenção na Sincronização</span>`;
            } else {
                statusIndicator.innerHTML = `<span class="badge badge-emerald"><span class="pulse-dot"></span> Programação Atualizada</span>`;
            }
        }

        // 2. Timestamp da Última Sincronização
        const lastTimeEl = document.getElementById('sync-last-time');
        if (lastTimeEl) {
            const timeAgo = formatRelativeTime(data.lastSync);
            lastTimeEl.innerHTML = `<span>${timeAgo}</span>`;
            lastTimeEl.title = data.lastSync || '';
        }

        // 3. Contagem de mídias
        const mediaCountEl = document.getElementById('sync-media-count');
        if (mediaCountEl) {
            mediaCountEl.textContent = `${data.cachedMediaCount || 0} arquivos salvos`;
        }

        // 4. Barra de Progresso
        const progressBox = document.getElementById('sync-progress-box');
        const progressBar = document.getElementById('sync-progress-bar-fill');
        const progressFilename = document.getElementById('sync-progress-filename');
        const progressPercent = document.getElementById('sync-progress-percentage');

        if (progressBox && progressBar) {
            if (data.status === 'syncing' && data.progress < 100) {
                progressBox.style.display = 'block';
                progressBar.style.width = `${data.progress || 0}%`;
                if (progressFilename) progressFilename.textContent = data.currentFile || 'Baixando mídias do Xibo...';
                if (progressPercent) progressPercent.textContent = `${data.progress || 0}%`;
            } else {
                progressBox.style.display = 'none';
            }
        }

        // 5. Galeria de mídias em cache
        const mediaGrid = document.getElementById('cached-media-grid');
        const mediaSummary = document.getElementById('media-cache-summary');
        if (mediaGrid && data.cachedMedia) {
            if (mediaSummary) {
                mediaSummary.textContent = `${data.cachedMedia.length} mídias ativas no armazenamento local`;
            }

            if (data.cachedMedia.length === 0) {
                mediaGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 14px; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); color: var(--text-muted); font-size: 0.85rem;">
                        Nenhuma mídia baixada ainda. Clique em <strong>"Forçar Sincronização Agora"</strong> para consultar o servidor Xibo.
                    </div>
                `;
            } else {
                mediaGrid.innerHTML = data.cachedMedia.map(m => {
                    const isVid = m.type === 'video';
                    return `
                        <div class="media-file-card">
                            <div class="media-file-info">
                                <span style="font-size: 1.3rem;">${isVid ? '🎬' : '🖼️'}</span>
                                <div style="overflow: hidden;">
                                    <div class="media-file-name" title="${escapeHtml(m.fileName)}">${escapeHtml(m.fileName)}</div>
                                    <div class="media-file-size">${m.sizeFormatted} • ${isVid ? 'Vídeo MP4' : 'Imagem'}</div>
                                </div>
                            </div>
                            <a href="${m.url}" target="_blank" class="btn-icon-action btn-icon-open" style="padding: 3px 8px; font-size: 0.72rem;" title="Ver Arquivo">
                                ↗️
                            </a>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.warn('Erro ao atualizar monitor de sync:', e);
    }
}

async function loadSettings() {
    try {
        const res = await fetch(`api/config?display=${currentAdminDisplay}`);
        const config = await res.json();

        if (document.getElementById('cmsUrl')) document.getElementById('cmsUrl').value = config.cmsUrl || 'http://10.15.25.29';
        if (document.getElementById('serverKey')) document.getElementById('serverKey').value = config.serverKey || 'semit';
        if (document.getElementById('displayName')) document.getElementById('displayName').value = config.displayName || (currentAdminDisplay === 'default' ? 'Protótipo 01' : `TV Corporativa - ${currentAdminDisplay.toUpperCase()}`);
        if (document.getElementById('hardwareKey')) document.getElementById('hardwareKey').value = config.hardwareKey || `tv_corp_${currentAdminDisplay}`;
        
        if (document.getElementById('weatherCity')) document.getElementById('weatherCity').value = config.weatherCity || 'Garça';
        if (document.getElementById('newsFeedUrl')) document.getElementById('newsFeedUrl').value = config.newsFeedUrl || 'https://g1.globo.com/rss/g1/';
        if (document.getElementById('emergencyMessage')) document.getElementById('emergencyMessage').value = config.emergencyMessage || 'Atenção: Comunicado oficial em andamento.';
        if (document.getElementById('orientationSelect')) document.getElementById('orientationSelect').value = config.orientation || 'landscape';
        if (document.getElementById('layoutSelect')) document.getElementById('layoutSelect').value = config.activeLayout || '3-zone-corporate';
        if (document.getElementById('resolutionSelect')) document.getElementById('resolutionSelect').value = config.resolution || 'auto';
    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
    }
}

async function saveLayoutFormat() {
    const orientation = document.getElementById('orientationSelect').value;
    const activeLayout = document.getElementById('layoutSelect').value;
    const resolution = document.getElementById('resolutionSelect').value;

    try {
        const res = await fetch(`api/config?display=${currentAdminDisplay}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orientation, activeLayout, resolution, displayId: currentAdminDisplay })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Formato aplicado com sucesso na TV (${currentAdminDisplay})!\nOrientação: ${orientation === 'portrait' ? 'Vertical 9:16 (Totem)' : 'Horizontal 16:9 (TV)'}\nLayout: ${activeLayout}`);
            await loadDisplaysList();
            refreshPreview();
        }
    } catch (e) {
        alert('Erro ao aplicar formato: ' + e.message);
    }
}

async function saveSettings(buttonEl) {
    const payload = {
        cmsUrl: document.getElementById('cmsUrl') ? document.getElementById('cmsUrl').value : undefined,
        serverKey: document.getElementById('serverKey') ? document.getElementById('serverKey').value : undefined,
        displayName: document.getElementById('displayName') ? document.getElementById('displayName').value : undefined,
        weatherCity: document.getElementById('weatherCity') ? document.getElementById('weatherCity').value : undefined,
        newsFeedUrl: document.getElementById('newsFeedUrl') ? document.getElementById('newsFeedUrl').value : undefined,
        displayId: currentAdminDisplay
    };

    const originalText = buttonEl ? buttonEl.innerHTML : null;
    if (buttonEl) {
        buttonEl.innerHTML = '⏳ Salvando...';
        buttonEl.disabled = true;
    }

    try {
        const res = await fetch(`api/config?display=${currentAdminDisplay}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            if (buttonEl) {
                buttonEl.innerHTML = '✅ Salvo!';
                buttonEl.style.backgroundColor = 'var(--emerald, #10b981)';
                setTimeout(() => {
                    buttonEl.innerHTML = originalText;
                    buttonEl.style.backgroundColor = '';
                    buttonEl.disabled = false;
                }, 2000);
            }
            alert(`Configurações da TV (${currentAdminDisplay}) salvas com sucesso!`);
            await loadDisplaysList();
            await checkXiboStatus();
            refreshPreview();
        } else {
            alert('Erro ao salvar: ' + (data.error || 'Erro desconhecido'));
            if (buttonEl) {
                buttonEl.innerHTML = originalText;
                buttonEl.disabled = false;
            }
        }
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
        if (buttonEl) {
            buttonEl.innerHTML = originalText;
            buttonEl.disabled = false;
        }
    }
}

async function loadPlaylistItems() {
    const container = document.getElementById('playlist-items-list');
    if (!container) return;

    try {
        const res = await fetch(`api/playlist?display=${currentAdminDisplay}`);
        const items = await res.json();

        if (items.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Nenhum slide manual cadastrado para esta TV.</p>`;
            return;
        }

        container.innerHTML = items.map((item, index) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 800; color: var(--accent-cyan); font-size: 1rem;">#${index + 1}</span>
                    <div>
                        <div style="font-weight: 700; color: #fff;">${escapeHtml(item.title)}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(item.subtitle || '')} • ⏱️ ${item.duration || 10}s</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge badge-primary" style="font-size: 0.7rem;">${item.tag || 'SLIDE'}</span>
                    <button type="button" class="btn-icon-action btn-icon-delete" onclick="deletePlaylistItem('${item.id}')">
                        Remover
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Erro ao carregar lista de slides:', e);
    }
}

async function addNewSlide() {
    const title = document.getElementById('newSlideTitle').value.trim();
    const subtitle = document.getElementById('newSlideSubtitle').value.trim();
    const body = document.getElementById('newSlideBody').value.trim();
    const tag = document.getElementById('newSlideTag').value.trim() || 'INFORMATIVO';
    const bgTheme = document.getElementById('newSlideTheme').value;
    const duration = parseInt(document.getElementById('newSlideDuration').value) || 12;

    if (!title) {
        alert('Por favor, informe ao menos o Título Principal do slide.');
        return;
    }

    const payload = {
        type: 'announcement',
        title,
        subtitle,
        body,
        tag,
        bgTheme,
        duration,
        displayId: currentAdminDisplay
    };

    try {
        const res = await fetch(`api/playlist/item?display=${currentAdminDisplay}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('newSlideTitle').value = '';
            document.getElementById('newSlideSubtitle').value = '';
            document.getElementById('newSlideBody').value = '';
            await loadPlaylistItems();
            await loadDisplaysList();
            refreshPreview();
            alert('Slide adicionado à programação com sucesso!');
        }
    } catch (e) {
        alert('Erro ao salvar slide: ' + e.message);
    }
}

window.deletePlaylistItem = async function(id) {
    if (!confirm('Deseja realmente remover este slide da programação?')) return;
    try {
        const res = await fetch(`api/playlist/item/${id}?display=${currentAdminDisplay}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            await loadPlaylistItems();
            await loadDisplaysList();
            refreshPreview();
        }
    } catch (e) {
        alert('Erro ao remover slide: ' + e.message);
    }
};

async function checkXiboStatus() {
    const statusBox = document.getElementById('xibo-cms-ping-status');
    try {
        const res = await fetch(`api/xibo/status?display=${currentAdminDisplay}`);
        const data = await res.json();
        if (statusBox) {
            if (data.online) {
                statusBox.innerHTML = `<span class="badge badge-emerald">Online (${data.latencyMs}ms)</span>`;
            } else {
                statusBox.innerHTML = `<span class="badge badge-amber">Offline / Indisponível</span>`;
            }
        }
    } catch (e) {
        if (statusBox) statusBox.innerHTML = `<span class="badge badge-amber">Erro de Conexão</span>`;
    }
}

async function registerWithXibo() {
    const btn = document.getElementById('btn-register-xibo');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
        const res = await fetch(`api/xibo/register?display=${currentAdminDisplay}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverKey: document.getElementById('serverKey').value,
                hardwareKey: document.getElementById('hardwareKey').value,
                displayName: document.getElementById('displayName').value,
                displayId: currentAdminDisplay
            })
        });
        const data = await res.json();
        alert(data.message || (data.success ? 'Display registrado com sucesso na SEMIT TV!' : 'Falha ao registrar display.'));
        await loadDisplaysList();
    } catch (e) {
        alert('Erro ao registrar na SEMIT TV: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Registrar no Xibo CMS';
    }
}

async function toggleEmergencyAlert(enable) {
    const msg = document.getElementById('emergencyMessage').value;
    try {
        await fetch(`api/config?display=${currentAdminDisplay}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                enableEmergencyAlert: enable,
                emergencyMessage: msg,
                displayId: currentAdminDisplay
            })
        });
        alert(enable ? '🚨 Transmissão de Emergência ATIVADA na TV!' : '✅ Alerta de Emergência DESATIVADO.');
        refreshPreview();
    } catch (e) {
        alert('Erro ao alterar status de emergência: ' + e.message);
    }
}

function refreshPreview() {
    const iframe = document.getElementById('preview-iframe');
    if (iframe) {
        const query = currentAdminDisplay === 'default' ? '' : `?display=${currentAdminDisplay}`;
        iframe.src = `./${query}`;
    }
}

function formatRelativeTime(isoString) {
    if (!isoString) return 'Nunca sincronizado';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Desconhecido';

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 10) return 'Agora mesmo';
    if (diffSec < 60) return `Há ${diffSec} seg`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}
