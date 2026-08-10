const mongoose = require('mongoose')
const { getStats } = require('./metrics')
const { getAuditPrometheusLines } = require('./audit-metrics-cache')
const { queuesEnabled, queueLength, QUEUE_EMAIL, QUEUE_JOBS } = require('./job-queue')

async function buildPrometheusBody() {
  const s = getStats()
  const lines = [
    '# HELP api_http_requests_total Total de requisições HTTP desde o boot',
    '# TYPE api_http_requests_total counter',
    `api_http_requests_total ${s.totalRequests}`,
    '# HELP api_http_request_duration_ms_avg Média de tempo de resposta (ms)',
    '# TYPE api_http_request_duration_ms_avg gauge',
    `api_http_request_duration_ms_avg ${s.avgResponseTimeMs}`,
    '# HELP api_http_request_duration_ms_p95 P95 tempo de resposta (ms)',
    '# TYPE api_http_request_duration_ms_p95 gauge',
    `api_http_request_duration_ms_p95 ${s.p95ResponseTimeMs}`,
    '# HELP api_process_uptime_seconds Uptime do processo Node',
    '# TYPE api_process_uptime_seconds gauge',
    `api_process_uptime_seconds ${s.uptimeSeconds}`,
    '# HELP api_mongo_ready MongoDB conectado (1=sim, 0=não)',
    '# TYPE api_mongo_ready gauge',
    `api_mongo_ready ${mongoose.connection.readyState === 1 ? 1 : 0}`,
  ]

  if (queuesEnabled()) {
    try {
      const emailQ = await queueLength(QUEUE_EMAIL)
      const jobsQ = await queueLength(QUEUE_JOBS)
      lines.push(
        '# HELP api_queue_length Tamanho da fila Redis',
        '# TYPE api_queue_length gauge',
        `api_queue_length{queue="email"} ${emailQ}`,
        `api_queue_length{queue="jobs"} ${jobsQ}`
      )
    } catch {
      /* redis indisponível no scrape */
    }
  }

  try {
    const auditLines = await getAuditPrometheusLines()
    lines.push(...auditLines)
  } catch {
    /* mongo indisponível no scrape */
  }

  return `${lines.join('\n')}\n`
}

module.exports = { buildPrometheusBody }
