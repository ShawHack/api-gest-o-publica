/**
 * XIBO CMS CLIENT & XMDS SYNC
 */
class XiboClient {
    constructor() {
        this.status = { online: false, lastCheck: null };
        this.config = null;
    }

    async init() {
        await this.loadConfig();
        await this.checkStatus();
        // Sincronização periódica a cada 60 segundos
        setInterval(() => this.checkStatus(), 60000);
    }

    async loadConfig() {
        try {
            const res = await fetch('api/config');
            this.config = await res.json();
        } catch (e) {
            console.error('Erro ao carregar configuração Xibo:', e);
        }
    }

    async checkStatus() {
        try {
            const res = await fetch('api/xibo/status');
            const data = await res.json();
            this.status = { ...data, lastCheck: new Date() };
            this.updateUiBadge();
        } catch (e) {
            this.status = { online: false, lastCheck: new Date() };
            this.updateUiBadge();
        }
    }

    async register() {
        try {
            const res = await fetch('api/xibo/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverKey: this.config?.serverKey,
                    hardwareKey: this.config?.hardwareKey,
                    displayName: this.config?.displayName
                })
            });
            return await res.json();
        } catch (e) {
            console.error('Erro ao registrar no Xibo CMS:', e);
            return { success: false, error: e.message };
        }
    }

    updateUiBadge() {
        const badge = document.getElementById('xibo-status-badge');
        if (!badge) return;

        if (this.status.online) {
            badge.className = 'badge badge-emerald';
            badge.innerHTML = '<span class="pulse-dot"></span> SEMIT TV Conectada';
        } else {
            badge.className = 'badge badge-amber';
            badge.innerHTML = '⚠️ SEMIT TV Modo Autônomo';
        }
    }
}
