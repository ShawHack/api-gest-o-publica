const { normalizePlusCode } = require('./rural-identity')

const DATABASE_URL = process.env.ROTAS_FIREBASE_DATABASE_URL || 'https://upa-rural-default-rtdb.firebaseio.com'
let cache = { expiresAt: 0, items: [] }

function mapCatalogItem(firebaseKey, raw) {
  const root = raw && typeof raw === 'object' ? raw : {}
  const geometry = root.geometry && typeof root.geometry === 'object' ? root.geometry : {}
  const value = (...keys) => {
    for (const key of keys) {
      if (root[key] != null) return root[key]
      if (geometry[key] != null) return geometry[key]
    }
    return undefined
  }
  const plusCode = normalizePlusCode(value(
    'global_code', 'plus_code', 'compound_code', 'plusCode', 'plus code',
    'Plus Code', 'pluscode', 'plus-code', 'plus', 'pluscode upa',
  ))
  return {
    firebaseKey,
    codigoUpa: String(value('codigo_upa', 'codigo UPA', 'Código UPA') || firebaseKey).trim(),
    plusCode,
    name: String(value('nome_upa', 'nome') || '').trim(),
    latitude: Number(value('latitude')) || undefined,
    longitude: Number(value('longitude')) || undefined,
  }
}

async function getCatalog() {
  if (cache.expiresAt > Date.now()) return cache.items
  const response = await fetch(`${DATABASE_URL}/upas.json`)
  if (!response.ok) throw new Error(`Catálogo de UPAs indisponível (${response.status})`)
  const data = (await response.json()) || {}
  const items = Object.entries(data).map(([key, raw]) => mapCatalogItem(key, raw))
  cache = { expiresAt: Date.now() + 5 * 60 * 1000, items }
  return items
}

async function findByPlusCode(plusCode) {
  const normalized = normalizePlusCode(plusCode)
  return (await getCatalog()).find((item) => item.plusCode === normalized) || null
}

function clearCatalogCache() {
  cache = { expiresAt: 0, items: [] }
}

module.exports = { mapCatalogItem, getCatalog, findByPlusCode, clearCatalogCache }
