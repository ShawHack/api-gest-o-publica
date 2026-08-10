/**
 * Cliente Redis opcional (Fase 3). Sem REDIS_URL → filas desabilitadas.
 */
let client = null
let connectPromise = null

function getRedisUrl() {
  return (process.env.REDIS_URL || '').trim()
}

async function getRedis() {
  const url = getRedisUrl()
  if (!url) return null
  if (client) return client
  if (!connectPromise) {
    connectPromise = (async () => {
      const { createClient } = require('redis')
      const c = createClient({ url })
      c.on('error', (err) => {
        console.error('[redis]', err?.message || err)
      })
      await c.connect()
      client = c
      return c
    })().catch((err) => {
      connectPromise = null
      throw err
    })
  }
  return connectPromise
}

async function closeRedis() {
  if (client) {
    await client.quit().catch(() => {})
    client = null
    connectPromise = null
  }
}

module.exports = { getRedis, getRedisUrl, closeRedis }
