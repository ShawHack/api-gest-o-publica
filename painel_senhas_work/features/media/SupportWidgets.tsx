import { useEffect, useState } from 'react'
import { fetchWeatherWidget, weatherLabelPt, type WeatherPayload } from '../../services/api/widgetsApi'
import './SupportWidgets.css'

const REFRESH_MS = 10 * 60 * 1000

/** Card de clima na área institucional (sem letreiro). */
export function SupportWidgets({ city }: { city: string }) {
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!city.trim()) {
        setWeather(null)
        return
      }
      try {
        const w = await fetchWeatherWidget(city.trim())
        if (cancelled) return
        setWeather(w)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Falha no clima')
      }
    }

    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [city])

  return (
    <div className="support-widgets" aria-label="Previsão do tempo">
      <div className="support-widgets__weather">
        {weather ? (
          <>
            <div className="support-widgets__temp">{Math.round(weather.temperature)}°</div>
            <div className="support-widgets__meta">
              <strong>{weather.city}</strong>
              <span>{weatherLabelPt(weather.weatherCode)}</span>
              <span className="support-widgets__detail">
                Umidade {weather.humidity}% · Vento {Math.round(weather.windSpeed)} km/h
              </span>
            </div>
          </>
        ) : (
          <div className="support-widgets__meta">
            <strong>{city || 'Clima'}</strong>
            <span>{error ? 'Indisponível' : 'Carregando previsão…'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
