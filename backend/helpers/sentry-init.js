/**
 * Sentry opcional — ativo apenas com SENTRY_DSN no .env
 */
let sentryModule = null
let sentryTried = false

function loadSentry() {
  if (sentryTried) return sentryModule
  sentryTried = true
  const dsn = (process.env.SENTRY_DSN || '').trim()
  if (!dsn) {
    sentryModule = null
    return null
  }
  try {
    const Sentry = require('@sentry/node')
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
      release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05'),
      sendDefaultPii: false,
    })
    console.log('[sentry] Inicializado')
    sentryModule = Sentry
    return Sentry
  } catch (err) {
    console.warn('[sentry] Pacote não instalado ou falha ao iniciar:', err?.message || err)
    sentryModule = null
    return null
  }
}

function initSentry() {
  return loadSentry()
}

function setupSentryExpress(app) {
  const Sentry = loadSentry()
  if (Sentry && app && typeof Sentry.setupExpressErrorHandler === 'function') {
    Sentry.setupExpressErrorHandler(app)
  }
}

module.exports = { initSentry, setupSentryExpress, loadSentry }
