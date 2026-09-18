/**
 * TICKER WIDGET (RSS News & Corporate Feed)
 */
class TickerWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.updateInterval = 5 * 60 * 1000; // 5 minutos
    }

    async init() {
        if (!this.container) return;
        await this.fetchNews();
        setInterval(() => this.fetchNews(), this.updateInterval);
    }

    async fetchNews() {
        try {
            const res = await fetch('api/news');
            const data = await res.json();
            this.render(data);
        } catch (err) {
            console.warn('Erro ao atualizar notícias do ticker:', err);
        }
    }

    render(data) {
        const items = data.items || [];
        if (items.length === 0) return;

        // Limpar títulos e limitar a itens válidos
        const validItems = items.slice(0, 15).map(item => {
            let cleanTitle = (item.title || '').replace(/\s+/g, ' ').trim();
            return cleanTitle;
        }).filter(t => t.length > 0);

        if (validItems.length === 0) return;

        // Duplicar lista para efeito de rolagem contínua infinita sem saltos
        const repeatedItems = [...validItems, ...validItems];
        const htmlItems = repeatedItems.map(title => `
            <div class="ticker-item">
                <span class="ticker-bullet"></span>
                <span class="ticker-text">${this.escapeHtml(title)}</span>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div class="ticker-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                <span>Notícias</span>
            </div>
            <div class="ticker-content-track">
                <div class="ticker-items" id="ticker-track-items">
                    ${htmlItems}
                </div>
            </div>
        `;

        // Velocidade lenta, calma e profissional de telejornal (~28 pixels por segundo)
        const track = document.getElementById('ticker-track-items');
        if (track) {
            setTimeout(() => {
                const totalWidth = track.scrollWidth;
                const halfWidth = totalWidth / 2;
                const durationSec = Math.max(120, Math.round(halfWidth / 28));
                track.style.animation = `ticker-scroll ${durationSec}s linear infinite`;
            }, 150);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
