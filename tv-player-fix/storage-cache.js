/**
 * STORAGE & OFFLINE CACHE (IndexedDB & LocalStorage)
 * Salva vídeos e mídias completos na memória interna do TV Box / Navegador para reprodução 100% offline
 */
class StorageCache {
    constructor() {
        this.dbName = 'xibo_tv_cache';
        this.dbVersion = 2;
        this.db = null;
        this.blobUrlCache = new Map();
        this.downloadQueue = new Set();
    }

    async init() {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB não suportado neste navegador');
                return resolve(false);
            }
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('media_blobs')) {
                    db.createObjectStore('media_blobs', { keyPath: 'url' });
                }
                if (!db.objectStoreNames.contains('layouts')) {
                    db.createObjectStore('layouts', { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('📦 Armazenamento local IndexedDB pronto para cache offline de vídeos.');
                resolve(true);
            };

            request.onerror = (e) => {
                console.warn('Erro ao abrir IndexedDB:', e);
                resolve(false);
            };
        });
    }

    async getMediaBlob(url) {
        if (!this.db) return null;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('media_blobs', 'readonly');
                const store = tx.objectStore('media_blobs');
                const req = store.get(url);
                req.onsuccess = () => {
                    if (req.result && req.result.blob) {
                        resolve(req.result.blob);
                    } else {
                        resolve(null);
                    }
                };
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }

    async saveMediaBlob(url, blob) {
        if (!this.db || !blob) return false;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('media_blobs', 'readwrite');
                const store = tx.objectStore('media_blobs');
                const req = store.put({
                    url: url,
                    blob: blob,
                    size: blob.size,
                    updatedAt: Date.now()
                });
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
            }
        });
    }

    async removeMedia(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const blobUrl = this.blobUrlCache.get(normalizedUrl);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        this.blobUrlCache.delete(normalizedUrl);
        if (!this.db) return false;
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('media_blobs', 'readwrite');
                const req = tx.objectStore('media_blobs').delete(normalizedUrl);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
            }
        });
    }

    normalizeUrl(url) {
        return String(url || '').replace(/^\//, '');
    }

    /** Retorna somente uma URL de blob de um arquivo integralmente salvo. */
    async getPlayableMediaUrl(url) {
        if (!url) return '';
        const normalizedUrl = this.normalizeUrl(url);

        // 1. Verifica cache em memória rápida
        if (this.blobUrlCache.has(normalizedUrl)) {
            return this.blobUrlCache.get(normalizedUrl);
        }

        // 2. Verifica se o vídeo está salvo no IndexedDB local do TV Box
        const blob = await this.getMediaBlob(normalizedUrl);
        if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            this.blobUrlCache.set(normalizedUrl, blobUrl);
            console.log(`⚡ Reproduzindo da MEMÓRIA LOCAL (Offline): ${normalizedUrl}`);
            return blobUrl;
        }

        return '';
    }

    /**
     * Faz download completo do vídeo em segundo plano e salva no IndexedDB
     */
    async downloadAndCacheMedia(url) {
        if (this.downloadQueue.has(url)) return false;
        this.downloadQueue.add(url);

        try {
            console.log(`📥 Baixando vídeo para salvar na memória local: ${url}`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const expectedSize = Number(res.headers.get('content-length'));
            const blob = await res.blob();
            
            if (!blob.size) throw new Error('Arquivo vazio');
            if (expectedSize > 0 && blob.size !== expectedSize) {
                throw new Error(`Arquivo incompleto: recebido ${blob.size} de ${expectedSize} bytes`);
            }
            const saved = await this.saveMediaBlob(url, blob);
            if (!saved) throw new Error('Não foi possível salvar no cache local');
            const blobUrl = URL.createObjectURL(blob);
            this.blobUrlCache.set(url, blobUrl);
            console.log(`✅ Vídeo salvo com sucesso na memória interna (${(blob.size / 1024 / 1024).toFixed(1)} MB): ${url}`);
            return true;
        } catch (err) {
            console.warn(`Aviso ao salvar mídia ${url} no cache:`, err);
            return false;
        } finally {
            this.downloadQueue.delete(url);
        }
    }

    /**
     * Baixa e valida a programação antes da reprodução. Não há fallback para
     * streaming: a TV só recebe URLs blob de arquivos completos no IndexedDB.
     */
    async ensurePlaylistMedia(playlist, onProgress = () => {}) {
        const urls = [...new Set((Array.isArray(playlist) ? playlist : [])
            .filter(item => item.url && (item.type === 'video' || item.type === 'media'))
            .map(item => this.normalizeUrl(item.url)))];
        let ready = 0;
        const failed = [];
        for (const url of urls) {
            const exists = await this.getMediaBlob(url);
            const ok = exists || await this.downloadAndCacheMedia(url);
            if (ok) ready += 1;
            else failed.push(url);
            onProgress({ ready, total: urls.length, failed: failed.length, url });
        }
        return { ready, total: urls.length, failed };
    }

    async preloadAllPlaylistMedia(playlist) { return this.ensurePlaylistMedia(playlist); }

    setLocal(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
        }
    }

    getLocal(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
}
