import type { OAuthTokens } from '../../types/config'
import type { ManagedPanel, ManagedPanelInput } from '../../types/panel'

const LOCAL_KEY = 'painel-semit:managed-panels'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    let detail = response.statusText
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) detail = data.error
    } catch {
      // ignore
    }
    throw new Error(detail)
  }
  return (await response.json()) as T
}

function readLocal(): ManagedPanel[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { panels?: ManagedPanel[] } | ManagedPanel[]
    return Array.isArray(parsed) ? parsed : parsed.panels || []
  } catch {
    return []
  }
}

function writeLocal(panels: ManagedPanel[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ panels }))
}

export async function listPanels(): Promise<ManagedPanel[]> {
  try {
    return await api<ManagedPanel[]>('/api/panels')
  } catch {
    return readLocal()
  }
}

export async function getPanel(idOrSlug: string): Promise<ManagedPanel> {
  try {
    return await api<ManagedPanel>(`/api/panels/${encodeURIComponent(idOrSlug)}`)
  } catch {
    const found = readLocal().find((p) => p.id === idOrSlug || p.slug === idOrSlug)
    if (!found) throw new Error('Painel não encontrado')
    return found
  }
}

export async function createPanel(input: ManagedPanelInput): Promise<ManagedPanel> {
  try {
    return await api<ManagedPanel>('/api/panels', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch {
    const now = new Date().toISOString()
    const panel: ManagedPanel = {
      id: crypto.randomUUID(),
      name: input.name,
      slug: (input.slug || input.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: input.status || 'publicado',
      novosgaApiUrl: input.novosgaApiUrl || '',
      mercurePublicUrl: input.mercurePublicUrl || '',
      units: input.units || [],
      panelTitle: input.panelTitle || input.name,
      institutionName: input.institutionName || 'Prefeitura de Garça — SEMIT',
      logoUrl: input.logoUrl || '',
      primaryColor: input.primaryColor || '#0b5fff',
      theme: input.theme || 'dark',
      displayLayout: input.displayLayout === 'programacao' ? 'programacao' : 'classic',
      historySize: input.historySize || 6,
      speechEnabled: input.speechEnabled !== false,
      speechVolume: input.speechVolume ?? 1,
      speechRate: input.speechRate ?? 1,
      speechVoice: input.speechVoice || 'auto-female',
      mediaEnabled: input.mediaEnabled !== false,
      mediaDurationMs: input.mediaDurationMs || 12000,
      mediaItems: input.mediaItems || [],
      widgetsEnabled: input.widgetsEnabled !== false,
      weatherCity: input.weatherCity || 'Garça',
      rssFeedUrl: input.rssFeedUrl || 'https://g1.globo.com/rss/g1/',
      createdAt: now,
      updatedAt: now,
    }
    const panels = [...readLocal(), panel]
    writeLocal(panels)
    return panel
  }
}

export async function updatePanel(idOrSlug: string, input: ManagedPanelInput): Promise<ManagedPanel> {
  try {
    return await api<ManagedPanel>(`/api/panels/${encodeURIComponent(idOrSlug)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  } catch {
    const panels = readLocal()
    const idx = panels.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug)
    if (idx < 0) throw new Error('Painel não encontrado')
    const current = panels[idx]!
    const next: ManagedPanel = {
      ...current,
      ...input,
      id: current.id,
      updatedAt: new Date().toISOString(),
      units: input.units || current.units,
    }
    panels[idx] = next
    writeLocal(panels)
    return next
  }
}

export async function deletePanel(idOrSlug: string): Promise<void> {
  try {
    await api(`/api/panels/${encodeURIComponent(idOrSlug)}`, { method: 'DELETE' })
  } catch {
    writeLocal(readLocal().filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug))
  }
}

/** Obtém sessão NovoSGA via credenciais gravadas no servidor do painel. */
export async function fetchManagedPanelSession(
  idOrSlug: string,
  refreshToken?: string,
): Promise<OAuthTokens> {
  const data = await api<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }>(`/api/panels/${encodeURIComponent(idOrSlug)}/token`, {
    method: 'POST',
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  })
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || '',
    expiresAt: Date.now() + (Math.max(60, data.expiresIn || 3600) - 300) * 1000,
  }
}
