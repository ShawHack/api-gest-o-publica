/**
 * WEATHER WIDGET (Open-Meteo & Live Weather)
 */
class WeatherWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.updateInterval = 10 * 60 * 1000; // 10 minutos
    }

    async init() {
        if (!this.container) return;
        await this.fetchWeather();
        setInterval(() => this.fetchWeather(), this.updateInterval);
    }

    async fetchWeather() {
        try {
            const res = await fetch('api/weather');
            const data = await res.json();
            this.render(data);
        } catch (err) {
            console.warn('Erro ao atualizar clima:', err);
        }
    }

    getWeatherIcon(code, isDay = 1) {
        // WMO Weather interpretation codes
        if (code === 0) return isDay ? '☀️' : '🌙'; // Clear
        if (code >= 1 && code <= 3) return isDay ? '⛅' : '☁️'; // Partly cloudy
        if (code >= 45 && code <= 48) return '🌫️'; // Fog
        if (code >= 51 && code <= 67) return '🌧️'; // Drizzle / Rain
        if (code >= 71 && code <= 77) return '❄️'; // Snow
        if (code >= 80 && code <= 82) return '🌦️'; // Rain showers
        if (code >= 95) return '⛈️'; // Thunderstorm
        return '🌤️';
    }

    getWeatherText(code) {
        if (code === 0) return 'Céu Limpo';
        if (code === 1) return 'Predomínio de Sol';
        if (code === 2) return 'Parcialmente Nublado';
        if (code === 3) return 'Nublado';
        if (code >= 45 && code <= 48) return 'Nevoeiro';
        if (code >= 51 && code <= 67) return 'Chuva Fraca';
        if (code >= 80 && code <= 82) return 'Pancadas de Chuva';
        if (code >= 95) return 'Tempestade com Raios';
        return 'Estável';
    }

    render(data) {
        const cur = data.current || {};
        const temp = Math.round(cur.temperature_2m || 24);
        const feel = Math.round(cur.apparent_temperature || temp);
        const humidity = Math.round(cur.relative_humidity_2m || 60);
        const wind = Math.round(cur.wind_speed_10m || 10);
        const code = cur.weather_code || 0;
        const isDay = cur.is_day !== undefined ? cur.is_day : 1;
        const icon = this.getWeatherIcon(code, isDay);
        const condition = this.getWeatherText(code);

        this.container.innerHTML = `
            <div class="weather-card glass-card">
                <div class="weather-header">
                    <div>
                        <div class="weather-city">${data.city || 'São Paulo'}</div>
                        <div class="weather-condition-tag">${condition}</div>
                    </div>
                    <span class="badge badge-emerald">Ao Vivo</span>
                </div>
                <div class="weather-main">
                    <div class="weather-temp-wrap">
                        <span class="weather-temp">${temp}</span>
                        <span class="weather-unit">°C</span>
                    </div>
                    <div class="weather-icon-wrap" style="font-size: 3rem;">
                        ${icon}
                    </div>
                </div>
                <div class="weather-details">
                    <div class="weather-detail-item">
                        <span>🌡️ Sensação:</span>
                        <strong>${feel}°C</strong>
                    </div>
                    <div class="weather-detail-item">
                        <span>💧 Umidade:</span>
                        <strong>${humidity}%</strong>
                    </div>
                </div>
            </div>
        `;
    }
}
