/**
 * Fila genérica em Redis (listas). Usada por e-mail e jobs PDF/refresh.
 */
const { getRedis, getRedisUrl } = require('./redis-client')

const QUEUE_EMAIL = 'queue:email'
const QUEUE_JOBS = 'queue:jobs'

async function enqueue(queue, payload) {
  const redis = await getRedis()
  if (!redis) return false
  await redis.lPush(queue, JSON.stringify({ ...payload, enqueuedAt: Date.now() }))
  return true
}

async function dequeue(queue, timeoutSec = 5) {
  const redis = await getRedis()
  if (!redis) return null
  const item = await redis.brPop(queue, timeoutSec)
  if (!item) return null
  try {
    return JSON.parse(item.element)
  } catch {
    return null
  }
}

async function queueLength(queue) {
  const redis = await getRedis()
  if (!redis) return 0
  return redis.lLen(queue)
}

function queuesEnabled() {
  return !!getRedisUrl()
}

module.exports = {
  QUEUE_EMAIL,
  QUEUE_JOBS,
  enqueue,
  dequeue,
  queueLength,
  queuesEnabled,
}
