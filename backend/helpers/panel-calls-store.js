const { getRedis } = require('./redis-client')

const REDIS_KEY = 'agenda:panel:recent-calls'
const MAX_ITEMS = 20
const TTL_SECONDS = 3600

function memoryStore() {
  return globalThis.__recentPanelCalls || (globalThis.__recentPanelCalls = [])
}

async function pushRecentPanelCall(callPayload) {
  const store = memoryStore()
  store.unshift(callPayload)
  if (store.length > MAX_ITEMS) store.length = MAX_ITEMS

  try {
    const redis = await getRedis()
    if (!redis) return
    await redis.lPush(REDIS_KEY, JSON.stringify(callPayload))
    await redis.lTrim(REDIS_KEY, 0, MAX_ITEMS - 1)
    await redis.expire(REDIS_KEY, TTL_SECONDS)
  } catch (_e) {
    // memória local continua válida na mesma instância
  }
}

async function getRecentPanelCalls() {
  try {
    const redis = await getRedis()
    if (redis) {
      const raw = await redis.lRange(REDIS_KEY, 0, MAX_ITEMS - 1)
      if (raw.length) {
        const parsed = raw
          .map((item) => {
            try {
              return JSON.parse(item)
            } catch (_e) {
              return null
            }
          })
          .filter(Boolean)
        if (parsed.length) {
          memoryStore().splice(0, memoryStore().length, ...parsed)
          return parsed
        }
      }
    }
  } catch (_e) {}

  return memoryStore()
}

/** Sequência diária de senhas da agenda por unidade/serviço (AG01, AG02, …). */
async function nextAgendaTicketNumber(unitId, serviceId, dateKey) {
  const key = `agenda:panel:ticket:${unitId}:${serviceId}:${dateKey}`
  try {
    const redis = await getRedis()
    if (redis) {
      const n = await redis.incr(key)
      await redis.expire(key, 172800)
      return n
    }
  } catch (_e) {}
  return (Date.now() % 99) + 1
}

module.exports = {
  pushRecentPanelCall,
  getRecentPanelCalls,
  nextAgendaTicketNumber,
}
