/**
 * Resolução de painéis de TV (slug ↔ NovoSGA) e filtro de chamadas da Agenda.
 * Registro conhecido — novos painéis entram aqui ou via API /api/panels no .31.
 */
const PANEL_REGISTRY = {
  semit: { novosgaUnitId: 6, defaultNovosgaServiceId: 89, unitName: 'SEMIT' },
  sedetur: { novosgaUnitId: 4, defaultNovosgaServiceId: 89, unitName: 'Sec. de Desenvolvimento Econômico' },
  semads: { novosgaUnitId: 5, defaultNovosgaServiceId: 89, unitName: 'SEMADS' },
  saae: { novosgaUnitId: 7, defaultNovosgaServiceId: 89, unitName: 'SAAE' },
}

const LEGACY_DEFAULT_SLUG = 'semit'

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase()
}

function registryEntry(slug) {
  return PANEL_REGISTRY[normalizeSlug(slug)] || null
}

function slugForNovosgaUnitId(unitId) {
  const id = Number(unitId)
  if (!Number.isFinite(id)) return LEGACY_DEFAULT_SLUG
  for (const [slug, meta] of Object.entries(PANEL_REGISTRY)) {
    if (meta.novosgaUnitId === id) return slug
  }
  return LEGACY_DEFAULT_SLUG
}

function novosgaUnitIdForSlug(slug) {
  return registryEntry(slug)?.novosgaUnitId ?? null
}

/**
 * Resolve destino de publicação/chamada a partir do serviço e unidade da Agenda.
 */
function resolvePanelTargets({ unit, service, panelSlug: explicitSlug } = {}) {
  const panelSlug = normalizeSlug(explicitSlug || service?.panelSlug || unit?.slug) || LEGACY_DEFAULT_SLUG
  const reg = registryEntry(panelSlug) || {}
  const novosgaUnitId = Number(
    service?.panelNovosgaUnitId || unit?.novosgaUnitId || reg.novosgaUnitId,
  ) || null
  const novosgaServiceId = Number(
    service?.panelNovosgaServiceId || reg.defaultNovosgaServiceId,
  ) || null
  return {
    panelSlug,
    novosgaUnitId,
    novosgaServiceId,
    unitName: unit?.name || reg.unitName || panelSlug.toUpperCase(),
  }
}

function callPanelSlug(call) {
  const slug = normalizeSlug(call?.panelSlug)
  if (slug) return slug
  const unitId = Number(call?.novosgaUnitId || call?.unidade || call?.servico?.unidade)
  if (Number.isFinite(unitId) && unitId > 0) return slugForNovosgaUnitId(unitId)
  return ''
}

/**
 * Filtra chamadas recentes da Agenda para um painel específico.
 * Chamadas legadas sem panelSlug continuam visíveis apenas no painel semit (retrocompat).
 */
function filterCallsForPanel(calls, panelSlug) {
  const target = normalizeSlug(panelSlug)
  if (!target) return calls
  return (calls || []).filter((call) => {
    const callSlug = callPanelSlug(call)
    if (!callSlug) return target === LEGACY_DEFAULT_SLUG
    return callSlug === target
  })
}

function mergeRegistryFromApiPanels(panels) {
  if (!Array.isArray(panels)) return
  for (const panel of panels) {
    const slug = normalizeSlug(panel?.slug)
    if (!slug) continue
    const unitId = Number(panel?.unitId || panel?.units?.[0]?.id)
    if (!PANEL_REGISTRY[slug]) {
      PANEL_REGISTRY[slug] = {
        novosgaUnitId: Number.isFinite(unitId) ? unitId : null,
        defaultNovosgaServiceId: null,
        unitName: panel?.unitName || panel?.units?.[0]?.name || panel?.name || slug,
      }
    } else if (Number.isFinite(unitId) && !PANEL_REGISTRY[slug].novosgaUnitId) {
      PANEL_REGISTRY[slug].novosgaUnitId = unitId
    }
  }
}

module.exports = {
  PANEL_REGISTRY,
  LEGACY_DEFAULT_SLUG,
  normalizeSlug,
  slugForNovosgaUnitId,
  novosgaUnitIdForSlug,
  resolvePanelTargets,
  filterCallsForPanel,
  callPanelSlug,
  mergeRegistryFromApiPanels,
}
