/**
 * PLAYLIST ENGINE (Media, Videos, Slides & KPI Transitions)
 * Otimizado para reprodução 24/7 fluida e sem travamentos no Navegador e TV Box (APK)
 */
function filterOverlayItems(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(i => {
    const s = String(i.subtitle || i.url || '').toLowerCase();
    return !s.includes('29.png') && !s.includes('watermark') && !s.includes('logo') && !s.includes('marca_dagua');
  });
}

class PlaylistEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.playlist = [];
        this.currentIndex = 0;
        this.timer = null;
        this.watchdog = null;
        this.pendingPlaylist = null;
        this.retryTimer = null;
        this.refreshInProgress = false;
        this.isPaused = false;
        
        // Estado de Áudio
        const savedMuted = localStorage.getItem('tv_audio_muted');
        this.isMuted = savedMuted === 'true'; // Se não tiver salvo, padrão é false ou respeita preferência
        this.volume = 1.0;
        this.cycleCount = 0;
    }

    async init() {
        if (!this.container) return;
        this.setupAudioUnlock();
        await this.loadPlaylist();
        if (this.playlist.length > 0) {
            if (await this.syncPlaylistBeforePlayback(this.playlist)) {
                await this.showCurrentSlide();
            } else {
                this.scheduleSyncRetry();
            }
        }

        // Verificação periódica em segundo plano de novas programações do Xibo (a cada 30s)
        setInterval(async () => {
            await this.refreshPlaylistInBackground();
        }, 30000);
    }

    setupAudioUnlock() {
        const unlock = () => {
            this.unmuteAudio();
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M' || e.code === 'Space' || e.code === 'Enter') {
                this.unmuteAudio();
            }
        });
    }

    unmuteAudio() {
        this.isMuted = false;
        localStorage.setItem('tv_audio_muted', 'false');
        const videoEl = document.getElementById('active-video-player');
        if (videoEl) {
            videoEl.muted = false;
            videoEl.volume = this.volume;
            videoEl.play().catch(() => {});
        }
        this.updateAudioBadge();
        const banner = document.getElementById('unmute-floating-banner');
        if (banner) banner.remove();
    }

    toggleAudio() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('tv_audio_muted', this.isMuted ? 'true' : 'false');
        const videoEl = document.getElementById('active-video-player');
        if (videoEl) {
            videoEl.muted = this.isMuted;
            videoEl.volume = this.isMuted ? 0 : this.volume;
            if (!this.isMuted) videoEl.play().catch(() => {});
        }
        this.updateAudioBadge();
        const banner = document.getElementById('unmute-floating-banner');
        if (!this.isMuted && banner) banner.remove();
        return !this.isMuted;
    }

    updateAudioBadge() {
        const badge = document.getElementById('audio-status-badge');
        if (!badge) return;
        if (this.isMuted) {
            badge.className = 'badge badge-amber';
            badge.innerHTML = '🔇 Áudio Mudo';
        } else {
            badge.className = 'badge badge-emerald';
            badge.innerHTML = '🔊 Áudio Ativo (100%)';
        }
    }

    showUnmuteBanner() {
        if (document.getElementById('unmute-floating-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'unmute-floating-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
            border: 2px solid #3b82f6;
            border-radius: 40px;
            padding: 12px 24px;
            color: #ffffff;
            font-family: sans-serif;
            font-size: 1rem;
            font-weight: 700;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.8), 0 0 15px rgba(59, 130, 246, 0.5);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        banner.innerHTML = `
            <span style="font-size: 1.2rem;">🔊</span>
            <span>Toque para <strong>Ativar o Som</strong></span>
        `;
        banner.addEventListener('click', (e) => {
            e.stopPropagation();
            this.unmuteAudio();
        });
        document.body.appendChild(banner);
    }

    renderSyncStatus(message) {
        if (!this.container) return;
        this.container.innerHTML = `<div class="slide-container active slide-bg-gradient-blue" style="display:flex;align-items:center;justify-content:center;text-align:center"><div><div class="badge badge-primary">SINCRONIZANDO</div><h2 class="slide-title">Programação em preparação</h2><div class="slide-subtitle">${message}</div></div></div>`;
    }

    scheduleSyncRetry(delayMs = 30000) {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(async () => {
            this.retryTimer = null;
            if (await this.syncPlaylistBeforePlayback(this.playlist)) {
                await this.showCurrentSlide();
            } else {
                this.scheduleSyncRetry(delayMs);
            }
        }, delayMs);
    }

    async syncPlaylistBeforePlayback(playlist, { showStatus = true } = {}) {
        const media = playlist.filter(item => item.url && (item.type === 'video' || item.type === 'media'));
        if (!media.length) return true;
        if (!window.storageCache || !window.storageCache.db) {
            if (showStatus) this.renderSyncStatus('Armazenamento local indisponível. A TV não iniciará mídia parcial.');
            return false;
        }
        if (showStatus) this.renderSyncStatus(`Baixando 0 de ${media.length} mídia(s) completa(s)…`);
        const result = await window.storageCache.ensurePlaylistMedia(playlist, progress => {
            if (showStatus) this.renderSyncStatus(`Baixando ${progress.ready} de ${progress.total} mídia(s) completa(s)…`);
        });
        if (result.failed.length) {
            console.error('Mídias não sincronizadas:', result.failed);
            if (showStatus) this.renderSyncStatus('Não foi possível concluir a programação. Nova tentativa será feita automaticamente.');
            return false;
        }
        return true;
    }

    async loadPlaylist() {
        const display = window.CURRENT_DISPLAY || 'default';
        const cacheKey = `cached_playlist_${display}`;
        
        // 1. Tenta carregar do cache local imediatamente (0ms de espera)
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.playlist = filterOverlayItems(parsed);
                }
            } catch (e) {}
        }

        // 2. Usa a playlist conhecida como ponto de partida, sem iniciar mídia parcial.
        if (this.playlist.length > 0) {
            await this.fetchPlaylistFromNetwork(display, cacheKey);
            return;
        }

        // 3. Se não tem cache prévio, busca da rede com timeout rápido
        await this.fetchPlaylistFromNetwork(display, cacheKey);
    }

    async fetchPlaylistFromNetwork(display, cacheKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(`api/playlist?display=${display}&t=${Date.now()}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const freshPlaylist = await res.json();

            if (Array.isArray(freshPlaylist) && freshPlaylist.length > 0) {
                this.playlist = filterOverlayItems(freshPlaylist);
                localStorage.setItem(cacheKey, JSON.stringify(freshPlaylist));
            }
        } catch (err) {
            console.warn('Erro ao buscar playlist da rede:', err);
        }

        if (!Array.isArray(this.playlist) || this.playlist.length === 0) {
            this.playlist = [
                {
                    id: 'fallback-1',
                    type: 'announcement',
                    title: 'SEMIT TV',
                    subtitle: 'Comunicação Oficial & Transparência',
                    body: 'Sistema conectado e pronto para exibição de informativos e vídeos.',
                    tag: 'ONLINE',
                    duration: 10,
                    bgTheme: 'gradient-blue'
                }
            ];
        }
    }

    async refreshPlaylistInBackground() {
        if (this.refreshInProgress) return;
        this.refreshInProgress = true;
        try {
            const display = window.CURRENT_DISPLAY || 'default';
            const res = await fetch(`api/playlist?display=${display}&t=${Date.now()}`);
            const newPlaylist = await res.json();
            
            const next = filterOverlayItems(newPlaylist);
            const currentStr = JSON.stringify(this.pendingPlaylist || this.playlist);
            const newStr = JSON.stringify(next);

            if (currentStr !== newStr && Array.isArray(newPlaylist) && newPlaylist.length > 0) {
                console.log('🔄 Nova programação detectada. Preparando sem interromper o vídeo atual...');
                if (await this.syncPlaylistBeforePlayback(next, { showStatus: false })) {
                    this.pendingPlaylist = next;
                }
            }
        } catch (e) {
            console.warn('Erro ao atualizar programação em segundo plano:', e);
        } finally {
            this.refreshInProgress = false;
        }
    }

    cleanupCurrentMedia() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.watchdog) {
            clearInterval(this.watchdog);
            this.watchdog = null;
        }

        const oldVideo = document.getElementById('active-video-player');
        if (oldVideo) {
            try {
                oldVideo.onended = null;
                oldVideo.onerror = null;
                oldVideo.onloadedmetadata = null;
                oldVideo.onplaying = null;
                oldVideo.oncanplay = null;
                oldVideo.ontimeupdate = null;
                oldVideo.pause();
                oldVideo.removeAttribute('src');
                while (oldVideo.firstChild) {
                    oldVideo.removeChild(oldVideo.firstChild);
                }
                oldVideo.load();
                oldVideo.remove();
            } catch (e) {}
        }
    }

    async showCurrentSlide() {
        if (this.playlist.length === 0) return;
        this.cleanupCurrentMedia();

        const item = this.playlist[this.currentIndex];
        const defaultDurationMs = (item.duration || 15) * 1000;

        let contentHtml = '';
        const bgClass = `slide-bg-${item.bgTheme || 'gradient-blue'}`;

        let rawUrl = item.url || '';
        let mediaUrl = rawUrl;
        if (window.storageCache) {
            mediaUrl = await window.storageCache.getPlayableMediaUrl(rawUrl);
        } else if (mediaUrl.startsWith('/')) {
            mediaUrl = mediaUrl.substring(1);
        }

        if ((item.type === 'video' || item.type === 'media') && !mediaUrl) {
            this.renderSyncStatus('Aguardando a mídia ficar disponível integralmente…');
            return;
        }

        if (item.type === 'video' && item.url) {
            contentHtml = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; overflow:hidden;">
                    <video id="active-video-player"
                           src="${mediaUrl}"
                           data-raw-src="${rawUrl}"
                           poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                           autoplay
                           muted
                           playsinline
                           webkit-playsinline
                           x5-playsinline
                           disablePictureInPicture
                           controlslist="nodownload nofullscreen noremoteplayback"
                           preload="auto"
                           style="max-width:100%; max-height:100%; width:100%; height:100%; object-fit:contain; background:#000; opacity:1;">
                    </video>
                </div>
            `;
        } else if (item.type === 'media' && item.url) {
            contentHtml = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; overflow:hidden;">
                    <img src="${mediaUrl}" style="max-width:100%; max-height:100%; width:100%; height:100%; object-fit:contain;" />
                </div>
            `;
        } else if (item.type === 'kpi') {
            const metricsHtml = (item.metrics || []).map(m => `
                <div class="kpi-card">
                    <div class="kpi-label">${m.label}</div>
                    <div class="kpi-value">${m.value}</div>
                    <div class="kpi-change">▲ ${m.change}</div>
                </div>
            `).join('');

            contentHtml = `
                <div class="slide-tag"><span class="badge badge-emerald">${item.subtitle || 'INDICADORES'}</span></div>
                <h2 class="slide-title">${item.title}</h2>
                <div class="kpi-grid">${metricsHtml}</div>
            `;
        } else {
            contentHtml = `
                <div class="slide-tag"><span class="badge badge-primary">${item.tag || 'DESTAQUE'}</span></div>
                <h2 class="slide-title">${item.title}</h2>
                <div class="slide-subtitle">${item.subtitle || ''}</div>
                <div class="slide-body">${item.body || ''}</div>
            `;
        }

        const isMediaOrVideo = item.type === 'video' || item.type === 'media';
        const mediaSlideClass = isMediaOrVideo ? 'media-slide-container' : '';

        this.container.innerHTML = `
            <div class="slide-container active ${bgClass} ${mediaSlideClass}">
                ${contentHtml}
                <div class="slide-progress" id="slide-progress-bar"></div>
            </div>
        `;

        if (item.type === 'video') {
            const videoEl = document.getElementById('active-video-player');
            if (videoEl) {
                videoEl.defaultMuted = true;
                videoEl.muted = true;
                videoEl.playsInline = true;

                let advanced = false;
                const safeAdvance = () => {
                    if (advanced) return;
                    advanced = true;
                    this.nextSlide();
                };

                // Avança naturalmente quando o vídeo termina
                videoEl.onended = () => {
                    safeAdvance();
                };

                // Arquivo local inválido: não usar streaming parcial como fallback.
                videoEl.onerror = async (e) => {
                    console.warn('Erro ao reproduzir mídia:', videoEl.src, e);
                    if (window.storageCache) await window.storageCache.removeMedia(rawUrl);
                    this.cleanupCurrentMedia();
                    this.renderSyncStatus('Falha ao reproduzir mídia local. A programação será sincronizada novamente.');
                    this.scheduleSyncRetry(3000);
                };

                const setupDuration = () => {
                    const dur = videoEl.duration;
                    if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                        const vidSec = Math.ceil(dur);
                        this.animateProgressBar(vidSec * 1000);
                    }
                };

                let lastTime = 0;
                let stalledChecks = 0;
                this.watchdog = setInterval(() => {
                    if (videoEl.paused || videoEl.ended) return;
                    if (videoEl.currentTime > lastTime + 0.2) {
                        lastTime = videoEl.currentTime;
                        stalledChecks = 0;
                    } else if (++stalledChecks >= 6) {
                        console.warn('Vídeo sem progresso; aguardando nova sincronização.', videoEl.src);
                        this.cleanupCurrentMedia();
                        this.renderSyncStatus('Vídeo sem progresso. Sincronizando novamente…');
                        this.scheduleSyncRetry(3000);
                    }
                }, 5000);

                videoEl.onloadedmetadata = setupDuration;
                videoEl.ondurationchange = setupDuration;
                videoEl.oncanplay = () => {
                    setupDuration();
                    videoEl.play().catch(() => {});
                };

                if (videoEl.readyState >= 1) {
                    setupDuration();
                }

                // Iniciar reprodução com áudio se configurado
                const playPromise = videoEl.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        if (!this.isMuted) {
                            videoEl.muted = false;
                            videoEl.volume = this.volume;
                        }
                    }).catch((err) => {
                        videoEl.muted = true;
                        videoEl.play().catch(() => {});
                    });
                }

            }
        } else {
            // Imagens e Cards com temporizador fixo
            this.animateProgressBar(defaultDurationMs);
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.nextSlide();
            }, defaultDurationMs);
        }
    }

    animateProgressBar(durationMs) {
        const progressBar = document.getElementById('slide-progress-bar');
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
            setTimeout(() => {
                progressBar.style.transition = `width ${durationMs}ms linear`;
                progressBar.style.width = '100%';
            }, 50);
        }
    }

    async nextSlide() {
        if (this.isPaused) return;
        this.cleanupCurrentMedia();

        this.currentIndex++;

        // A programação nova só substitui a atual entre mídias, nunca durante vídeo.
        if (this.pendingPlaylist) {
            this.playlist = this.pendingPlaylist;
            this.pendingPlaylist = null;
            this.currentIndex = 0;
        }

        // Ao completar uma volta inteira na playlist
        if (this.currentIndex >= this.playlist.length) {
            this.currentIndex = 0;
            this.cycleCount++;
        }

        await this.showCurrentSlide();
    }

    prevSlide() {
        if (this.isPaused) return;
        this.cleanupCurrentMedia();
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.showCurrentSlide();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const video = document.getElementById('active-video-player');
        if (video) {
            if (this.isPaused) video.pause();
            else video.play().catch(() => {});
        }
        return this.isPaused;
    }
}
