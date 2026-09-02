import type { DisplayCall } from '../../types/call'
import type { UnitBinding } from '../../types/config'
import { parsePainelSenhaList } from './adapters/painelSenhaAdapter'
import { apiInfoSchema } from './adapters/schemas'
import { apiRequest } from './client'
import type { NovoSgaApiInfo } from '../../types/novosga'

export async function fetchApiInfo(apiUrl: string, token: string): Promise<NovoSgaApiInfo> {
  const raw = await apiRequest<unknown>(apiUrl, '', { token })
  const parsed = apiInfoSchema.parse(raw)
  return {
    status: parsed.status,
    time: parsed.time,
    mercureUrl: parsed.mercureUrl ?? null,
  }
}

export async function fetchPainelCalls(
  apiUrl: string,
  token: string,
  unitId: number,
  serviceIds: number[],
  source: DisplayCall['source'] = 'api',
  unitName?: string,
): Promise<DisplayCall[]> {
  const servicos = serviceIds.filter((id) => id > 0).join(',')
  const query = servicos ? `?servicos=${encodeURIComponent(servicos)}` : '?servicos='
  const raw = await apiRequest<unknown>(apiUrl, `/unidades/${unitId}/painel${query}`, { token })
  return parsePainelSenhaList(raw, source).map((call) => ({
    ...call,
    unitId,
    unitName,
  }))
}

/** Busca senhas de todas as unidades configuradas e mescla com chamadas da Agenda Garça (filtradas por painel). */
export async function fetchPainelCallsForUnits(
  apiUrl: string,
  token: string,
  units: UnitBinding[],
  source: DisplayCall['source'] = 'api',
  panelSlug?: string,
): Promise<DisplayCall[]> {
  const active = units.filter((u) => u.id > 0 && u.serviceIds.length > 0)
  
  const lists: DisplayCall[][] = await Promise.all(
    active.map((unit) =>
      fetchPainelCalls(apiUrl, token, unit.id, unit.serviceIds, source, unit.name),
    ),
  )

  const slug = (() => {
    if (panelSlug) return panelSlug
    if (typeof window === 'undefined') return ''
    const pathMatch = window.location.pathname.match(/\/p\/([^/?#]+)/)
    const hashDisplayMatch = (window.location.hash || '').match(/\/display\/([^?#/]+)/)
    const hashPMatch = (window.location.hash || '').match(/#\/p\/([^?#/]+)/)
    const hashDirectMatch = (window.location.hash || '').match(/^#\/([^?#/]+)$/)
    const searchParams = new URLSearchParams(
      window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '')
    )
    const querySlug = searchParams.get('slug') || searchParams.get('painel') || searchParams.get('p')
    return (
      pathMatch?.[1] ||
      hashDisplayMatch?.[1] ||
      hashPMatch?.[1] ||
      (hashDirectMatch?.[1] && !['admin', 'settings', 'display'].includes(hashDirectMatch[1]) ? hashDirectMatch[1] : '') ||
      querySlug ||
      'semit'
    )
  })()

  try {
    const query = slug ? `?slug=${encodeURIComponent(slug)}` : ''
    const agendaRes = await fetch(`/api/agenda/public/panels/calls${query}`)
    if (agendaRes.ok) {
      const data = await agendaRes.json()
      if (Array.isArray(data.items) && data.items.length > 0) {
        const agendaCalls: DisplayCall[] = data.items.map((item: Record<string, unknown>) => ({
          id: Number(item.id) || Date.now(),
          ticket: String(item.senha || 'AG01'),
          prefix: String(item.siglaSenha || 'AG'),
          number: Number(item.numeroSenha) || 1,
          localName: String(item.local || 'Guichê'),
          localNumber: Number(item.numeroLocal) || 1,
          localLabel: `${String(item.local || 'Guichê')} ${String(item.numeroLocal || 1).padStart(2, '0')}`,
          serviceId: Number((item.servico as { id?: number })?.id) || 99,
          serviceName: String((item.servico as { nome?: string })?.nome || 'Agendamento'),
          priorityName: 'Agendamento',
          priorityWeight: 1,
          priorityColor: String(item.corPrioridade || '#0b5fff'),
          clientName: (item.nomeCliente as string | null) ?? null,
          calledAt: String(item.calledAt || new Date().toISOString()),
          source: 'api',
          unitId: Number(item.novosgaUnitId) || undefined,
          unitName: String(item.unitName || slug.toUpperCase() || 'Agenda'),
        }))
        lists.push(agendaCalls)
      }
    }
  } catch (_e) {}

  return lists.flat().sort((a, b) => {
    const ta = Date.parse(a.calledAt || '') || a.id
    const tb = Date.parse(b.calledAt || '') || b.id
    return tb - ta
  })
}
