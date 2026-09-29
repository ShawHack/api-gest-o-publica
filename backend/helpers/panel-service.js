const crypto = require('crypto')
const MERCURE_HUB_URL = process.env.MERCURE_HUB_URL || 'http://10.15.25.31:3000/.well-known/mercure'
const MERCURE_SECRET = process.env.MERCURE_PUBLISHER_JWT_KEY || '!ChangeThisMercureHubJWTSecretKey!'
const PANELS_API_URL = process.env.PANELS_API_URL || 'http://10.15.25.31:8088/api/panels'
const { mergeRegistryFromApiPanels, resolvePanelTargets } = require('./panel-resolver')

function generateMercurePublisherToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    mercure: { publish: ['*'], subscribe: ['*'] },
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', MERCURE_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

let panelsCache = null
let panelsCacheTime = 0

async function listAvailablePanels() {
  const now = Date.now()
  if (panelsCache && (now - panelsCacheTime) < 30000) {
    return panelsCache
  }
  try {
    const res = await fetch(PANELS_API_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        panelsCache = data.map((p) => ({
          id: p.id,
          name: p.name || p.panelTitle || p.slug,
          slug: p.slug,
          novosgaApiUrl: p.novosgaApiUrl,
          unitId: p.units?.[0]?.id || null,
          unitName: p.units?.[0]?.name || null,
        }))
        mergeRegistryFromApiPanels(panelsCache)
        panelsCacheTime = now
        return panelsCache
      }
    }
  } catch (_e) {
    // Fallback caso a API remota de painéis esteja temporariamente inacessível
  }

  return [
    { id: 'sedetur', name: 'Sedetur (Sala de Espera)', slug: 'sedetur', unitId: 4, unitName: 'Sec. de Desenvolvimento Econômico' },
    { id: 'semit', name: 'Semit (Painel Geral)', slug: 'semit', unitId: 6, unitName: 'SEMIT' },
    { id: 'semads', name: 'SEMADS (Assistência Social)', slug: 'semads', unitId: 5, unitName: 'SEMADS' },
    { id: 'saae', name: 'SAAE (Atendimento)', slug: 'saae', unitId: 7, unitName: 'SAAE' },
  ]
}

async function publishCallToPanel({
  panelSlug,
  unitId,
  novosgaServiceId,
  ticket,
  prefix = 'AG',
  number = 1,
  localName = 'Guichê',
  localNumber = 1,
  serviceName = 'Agendamento',
  serviceId = 1,
  clientName = 'Cidadão',
  document = '',
}) {
  const now = new Date().toISOString()
  const results = { panelApi: false, mercure: false, novosga: false }
  const resolved = resolvePanelTargets({ panelSlug, service: { panelSlug, panelNovosgaUnitId: unitId, panelNovosgaServiceId: novosgaServiceId } })
  const targetSlug = resolved.panelSlug
  const targetUnitId = resolved.novosgaUnitId || unitId
  const targetServiceId = resolved.novosgaServiceId || (typeof serviceId === 'number' ? serviceId : null)

  const payload = {
    id: Date.now(),
    senha: ticket || `${prefix}${String(number).padStart(2, '0')}`,
    siglaSenha: prefix,
    numeroSenha: number,
    local: localName,
    numeroLocal: Number(localNumber) || 1,
    servico: {
      id: targetServiceId || 99,
      nome: serviceName,
    },
    prioridade: 'Agendamento Web',
    peso: 1,
    corPrioridade: '#059669',
    nomeCliente: clientName,
    documentoCliente: document,
    panelSlug: targetSlug,
    calledAt: now,
  }

  // 1. Emitir ticket no NovoSGA (quando unidade/serviço conhecidos)
  if (targetUnitId && targetServiceId) {
    try {
      const tokenRes = await fetch(`http://10.15.25.31:8088/api/panels/${encodeURIComponent(targetSlug)}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(3000),
      })
      if (tokenRes.ok) {
        const { accessToken } = await tokenRes.json()
        if (accessToken) {
          await fetch('http://10.15.25.31/api/distribui', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              unidade: targetUnitId,
              servico: targetServiceId,
              prioridade: 3,
              cliente: {
                nome: clientName || 'Cidadão',
                documento: document || '',
              },
            }),
            signal: AbortSignal.timeout(3000),
          }).catch(() => {})
          results.novosga = true
        }
      }
    } catch (_e) {}
  }

  // 2. API do painel de TV — somente o slug configurado (sem broadcast cruzado)
  if (targetSlug) {
    try {
      const panelUrl = `http://10.15.25.31:8088/api/panels/${encodeURIComponent(targetSlug)}/call`
      const res = await fetch(panelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) results.panelApi = true
    } catch (_e) {}
  }

  // 3. Mercure Hub (com token JWT assinado)
  if (targetUnitId) {
    const topics = [
      `http://10.15.25.31/unidades/${targetUnitId}/painel`,
      `/unidades/${targetUnitId}/painel`,
      `/paineis`,
      `http://10.15.25.31/paineis`,
    ]

    const mercurePayload = {
      '@type': 'PainelSenha',
      ...payload,
    }

    try {
      const mercureToken = generateMercurePublisherToken()
      for (const topic of topics) {
        try {
          const body = new URLSearchParams()
          body.set('topic', topic)
          body.set('data', JSON.stringify(mercurePayload))

          const res = await fetch(MERCURE_HUB_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${mercureToken}`,
            },
            body: body.toString(),
            signal: AbortSignal.timeout(2000),
          })
          if (res.ok) results.mercure = true
        } catch (_e) {}
      }
    } catch (_e) {}
  }

  return { success: true, payload, results, panelSlug: targetSlug }
}

module.exports = {
  listAvailablePanels,
  publishCallToPanel,
}
