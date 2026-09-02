export type WeatherPayload = {
  city: string
  admin1: string
  country: string
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  updatedAt: string
}

export type RssPayload = {
  url: string
  titles: string[]
  fetchedAt: string
}

export async function fetchWeatherWidget(city: string): Promise<WeatherPayload> {
  const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
  const data = (await response.json()) as WeatherPayload & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Falha ao carregar clima')
  return data
}

export async function fetchRssWidget(feedUrl: string): Promise<RssPayload> {
  const response = await fetch(`/api/rss?url=${encodeURIComponent(feedUrl)}`)
  const data = (await response.json()) as RssPayload & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Falha ao carregar notícias')
  return data
}

/** Descrição curta WMO / Open-Meteo. */
export function weatherLabelPt(code: number): string {
  if (code === 0) return 'Céu limpo'
  if (code === 1) return 'Principalmente limpo'
  if (code === 2) return 'Parcialmente nublado'
  if (code === 3) return 'Nublado'
  if (code === 45 || code === 48) return 'Neblina'
  if (code >= 51 && code <= 57) return 'Garoa'
  if (code >= 61 && code <= 67) return 'Chuva'
  if (code >= 71 && code <= 77) return 'Neve'
  if (code >= 80 && code <= 82) return 'Pancadas de chuva'
  if (code >= 85 && code <= 86) return 'Pancadas de neve'
  if (code === 95) return 'Tempestade'
  if (code === 96 || code === 99) return 'Tempestade com granizo'
  return 'Condições variáveis'
}
