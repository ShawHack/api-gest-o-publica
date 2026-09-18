/**
 * TV CORPORATIVA - MAIN PLAYER APPLICATION
 */

window.CURRENT_DISPLAY = new URLSearchParams(window.location.search).get('display') || 
                         new URLSearchParams(window.location.search).get('id') || 'default';

document.addEventListener('DOMContentLoaded', async () => {
    // 0. Detecta se está embutido em iframe (Painel de Senhas / Displays Web)
    if (window.self !== window.top) {
        document.body.classList.add('is-embedded');
        const root = document.getElementById('player-root');
        if (root) root.classList.add('is-embedded');
    }

    // 1. Relógio local instantâneo
    initClock();

    // 2. Inicializa Armazenamento Local Offline (IndexedDB)
    window.storageCache = new StorageCache();
    await window.storageCache.init().catch(() => false);

    // 3. INICIA O MOTOR DE VÍDEO IMEDIATAMENTE (Prioridade Máxima 0ms de delay)
    const playlistEngine = new PlaylistEngine('player-main-zone');
    await playlistEngine.init();

    // 4. Atalhos de Teclado / Controle Remoto
    setupKeyboardShortcuts(playlistEngine);

    // 5. Executa widgets secundários e configurações em paralelo (não bloqueante)
    applyLayoutConfig().catch(() => {});
    setInterval(() => applyLayoutConfig().catch(() => {}), 15000);

    const weatherWidget = new WeatherWidget('weather-widget-container');
    weatherWidget.init().catch(() => {});

    const tickerWidget = new TickerWidget('ticker-widget-container');
    tickerWidget.init().catch(() => {});

    const xiboClient = new XiboClient();
    xiboClient.init().catch(() => {});

    // 5. Monitoramento de download em segundo plano
    monitorDownloadProgress();
    setInterval(monitorDownloadProgress, 5000);

    // 6. Monitoramento de Alertas de Emergência
    checkEmergencyAlert();
    setInterval(checkEmergencyAlert, 20000);

    // 6. Comunicação com o painel Admin (Pause / Play no iframe de Preview)
    window.addEventListener('message', (e) => {
        if (e.data && e.data.action === 'togglePause') {
            if (e.data.paused !== undefined) {
                playlistEngine.isPaused = e.data.paused;
            } else {
                playlistEngine.togglePause();
            }
            const video = document.getElementById('active-video-player');
            if (video) {
                if (playlistEngine.isPaused) video.pause();
                else video.play().catch(() => {});
            }
        }
    });
});

async function monitorDownloadProgress() {
    const card = document.getElementById('download-progress-card');
    const badge = document.getElementById('sync-status-badge');
    const badgeText = document.getElementById('sync-badge-text');
    const percentEl = document.getElementById('download-percentage');
    const barFill = document.getElementById('download-bar-fill');
    const fileEl = document.getElementById('download-filename');

    try {
        const res = await fetch(`api/xibo/sync-status?display=${window.CURRENT_DISPLAY}`);
        const sync = await res.json();

        if (sync.status === 'syncing' || sync.status === 'downloading') {
            if (card) card.classList.add('visible');
            if (badge) badge.style.display = 'inline-flex';
            if (badgeText) badgeText.textContent = `Sincronizando: ${sync.progress}%`;
            if (percentEl) percentEl.textContent = `${sync.progress}%`;
            if (barFill) barFill.style.width = `${sync.progress}%`;
            if (fileEl) fileEl.textContent = sync.currentFile || 'Baixando novos arquivos do CMS...';
        } else {
            // Concluído ou em repouso
            if (card && card.classList.contains('visible')) {
                if (barFill) barFill.style.width = '100%';
                if (percentEl) percentEl.textContent = '100%';
                if (fileEl) fileEl.textContent = 'Sincronização 100% Concluída!';
                setTimeout(() => {
                    card.classList.remove('visible');
                    if (badge) badge.style.display = 'none';
                }, 2000);
            }
        }
    } catch (e) {}
}

function initClock() {
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    function update() {
        const now = new Date();
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        }
    }

    update();
    setInterval(update, 1000);
}

async function checkEmergencyAlert() {
    try {
        const res = await fetch(`api/config?display=${window.CURRENT_DISPLAY}`);
        const config = await res.json();
        const overlay = document.getElementById('emergency-overlay');
        const messageEl = document.getElementById('emergency-message');

        if (config.enableEmergencyAlert) {
            overlay.classList.add('active');
            if (messageEl && config.emergencyMessage) {
                messageEl.textContent = config.emergencyMessage;
            }
        } else {
            overlay.classList.remove('active');
        }
    } catch (e) {}
}

async function applyLayoutConfig() {
    try {
        const res = await fetch(`api/config?display=${window.CURRENT_DISPLAY}`);
        const config = await res.json();
        const root = document.getElementById('player-root');
        if (!root) return;

        // Atualizar Nome da TV no Header caso seja um protótipo específico
        if (config.displayName && config.displayId && config.displayId !== 'default') {
            const brandH1 = document.querySelector('.brand-info h1');
            if (brandH1) {
                brandH1.textContent = config.displayName.toUpperCase();
            }
        }

        // 1. Orientação (Horizontal 16:9 vs Vertical 9:16)
        if (config.orientation === 'portrait') {
            root.classList.add('orientation-portrait');
        } else {
            root.classList.remove('orientation-portrait');
        }

        // 2. Estilo de Layout
        if (config.activeLayout === 'fullscreen-media') {
            root.classList.add('layout-fullscreen');
        } else {
            root.classList.remove('layout-fullscreen');
        }
    } catch (e) {
        console.warn('Erro ao carregar formato de layout:', e);
    }
}

function setupKeyboardShortcuts(playlistEngine) {
    // Clique no badge de áudio
    const audioBadge = document.getElementById('audio-status-badge');
    if (audioBadge) {
        audioBadge.addEventListener('click', () => {
            playlistEngine.toggleAudio();
        });
    }

    document.addEventListener('keydown', (e) => {
        // Tecla M: Mute / Unmute (Ativar/Desativar Som)
        if (e.key === 'm' || e.key === 'M') {
            playlistEngine.toggleAudio();
        }
        // Espaço: Pausar/Retomar
        if (e.code === 'Space') {
            e.preventDefault();
            playlistEngine.togglePause();
        }
        // Seta Direita / Próximo slide
        if (e.code === 'ArrowRight' || e.code === 'Enter') {
            playlistEngine.nextSlide();
        }
        // Seta Esquerda / Slide anterior
        if (e.code === 'ArrowLeft') {
            playlistEngine.prevSlide();
        }
        // Tecla F11 ou F: Tela Cheia
        if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
        // Tecla C: Ir para Configurações
        if (e.key === 'c' || e.key === 'C') {
            window.location.href = '/admin.html';
        }
    });
}
