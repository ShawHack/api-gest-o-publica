/**
 * Auditoria de requisições do app Flutter (X-Client-App: prefeitura_app).
 * Registra falhas HTTP (4xx/5xx) com contexto mobile — evita duplicar mutações já auditadas nos controllers.
 */
const { parseClient, recordSecurity, inferModule } = require('./audit-service')

const SKIP_PATHS = /^\/(health|readyz|openapi\.json)(\/|$)/

function clientAppAuditMiddleware(req, res, next) {
  res.on('finish', () => {
    try {
      const client = parseClient(req)
      if (client.app !== 'prefeitura_app') return
      if (req.method === 'OPTIONS') return

      const path = req.originalUrl || req.path || ''
      if (SKIP_PATHS.test(path)) return

      const statusCode = res.statusCode
      if (statusCode < 400) return

      const moduleName = client.moduleHint || inferModule({ path, client })

      void recordSecurity(req, {
        action: 'app.request_failed',
        module: moduleName,
        resourceType: 'api_request',
        eventType: 'SECURITY',
        status: statusCode >= 500 ? 'error' : 'denied',
        metadata: {
          statusCode,
          screen: client.screen,
          platform: client.platform,
          version: client.version,
          requestId: client.requestId,
        },
      })
    } catch (_err) {
      // não bloquear resposta
    }
  })
  next()
}

module.exports = { clientAppAuditMiddleware }
