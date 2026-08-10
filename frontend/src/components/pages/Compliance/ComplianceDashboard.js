import { useEffect, useMemo, useState } from 'react'
import api from '../../../utils/api'
import AuditEventDetail from './AuditEventDetail'
import MonitoringAccessCard from './MonitoringAccessCard'
import {
  CLIENT_APP_OPTIONS,
  EVENT_TYPE_OPTIONS,
  MODULE_OPTIONS,
  moduleLabel,
  statusColor,
} from './auditConstants'
import styles from './ComplianceDashboard.module.css'

const DEFAULT_LOOKBACK = 24
const DEFAULT_LIMIT = 20
const CSV_EXPORT_MAX_PAGES = 10

function fmtDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return String(value)
  }
}

function severityColor(severity) {
  if (severity === 'high') return '#b42318'
  if (severity === 'medium') return '#b54708'
  return '#027a48'
}

function toIsoStart(value) {
  if (!value) return ''
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function toIsoEnd(value) {
  if (!value) return ''
  const d = new Date(`${value}T23:59:59`)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function clientSummary(item) {
  const c = item?.client || {}
  if (!c.app && !c.platform) return '-'
  return [c.app, c.platform].filter(Boolean).join(' / ')
}

const CSV_HEADER = [
  'id',
  'createdAt',
  'module',
  'eventType',
  'action',
  'resourceType',
  'resourceId',
  'status',
  'actorId',
  'actorName',
  'actorRole',
  'actorEmail',
  'ip',
  'clientApp',
  'clientPlatform',
  'clientScreen',
  'requestId',
  'route',
  'method',
  'changesCount',
]

function itemToCsvRow(item) {
  const c = item.client || {}
  return [
    item._id,
    item.createdAt,
    item.module,
    item.eventType,
    item.action,
    item.resourceType,
    item.resourceId,
    item.status,
    item.actorId,
    item.actorName,
    item.actorRole,
    item.actorEmail,
    item.ip,
    c.app,
    c.platform,
    c.screen,
    item.requestId || c.requestId,
    item.route,
    item.method,
    Array.isArray(item.changes) ? item.changes.length : 0,
  ]
}

export default function ComplianceDashboard() {
  const [loading, setLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lookbackHours, setLookbackHours] = useState(DEFAULT_LOOKBACK)
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPages, setLogsPages] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLimit, setLogsLimit] = useState(DEFAULT_LIMIT)
  const [logsAction, setLogsAction] = useState('')
  const [logsStatus, setLogsStatus] = useState('')
  const [logsResourceType, setLogsResourceType] = useState('')
  const [logsModule, setLogsModule] = useState('')
  const [logsEventType, setLogsEventType] = useState('')
  const [logsIp, setLogsIp] = useState('')
  const [logsClientApp, setLogsClientApp] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [notificationStatus, setNotificationStatus] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [error, setError] = useState('')

  const requiresActionCount = alerts?.overview?.requiresActionCount || 0
  const highestSeverity = alerts?.overview?.highestSeverity || 'low'

  const topAlertRows = useMemo(() => {
    if (!alerts?.alerts) return []
    const rows = []
    for (const row of alerts.alerts.deniedSpikes || []) rows.push({ type: 'Pico de negacao', ...row })
    for (const row of alerts.alerts.repeatedDeniedByActor || []) rows.push({ type: 'Negacao por ator', ...row })
    for (const row of alerts.alerts.repeatedDeniedByIp || []) rows.push({ type: 'Negacao por IP', ...row })
    for (const row of alerts.alerts.offHoursCriticalActions || []) rows.push({ type: 'Acao critica fora de horario', ...row })
    return rows.slice(0, 20)
  }, [alerts])

  const moduleBreakdown = summary?.byModule || []

  function buildLogsQuery(pageOverride = logsPage, overrides = {}) {
    const params = new URLSearchParams()
    const action = overrides.action !== undefined ? overrides.action : logsAction
    const status = overrides.status !== undefined ? overrides.status : logsStatus
    const resourceType = overrides.resourceType !== undefined ? overrides.resourceType : logsResourceType
    const module = overrides.module !== undefined ? overrides.module : logsModule
    const eventType = overrides.eventType !== undefined ? overrides.eventType : logsEventType
    const ip = overrides.ip !== undefined ? overrides.ip : logsIp
    const clientApp = overrides.clientApp !== undefined ? overrides.clientApp : logsClientApp
    const limit = overrides.limit !== undefined ? overrides.limit : logsLimit

    params.set('page', String(pageOverride))
    params.set('limit', String(limit))
    if (action.trim()) params.set('action', action.trim())
    if (status.trim()) params.set('status', status.trim())
    if (resourceType.trim()) params.set('resourceType', resourceType.trim())
    if (module.trim()) params.set('module', module.trim())
    if (eventType.trim()) params.set('eventType', eventType.trim())
    if (ip.trim()) params.set('ip', ip.trim())
    if (clientApp.trim()) params.set('clientApp', clientApp.trim())
    const fromIso = toIsoStart(fromDate)
    const toIso = toIsoEnd(toDate)
    if (fromIso) params.set('from', fromIso)
    if (toIso) params.set('to', toIso)
    return params.toString()
  }

  async function loadLogs(pageOverride = logsPage, overrides = {}) {
    setLogsLoading(true)
    try {
      const query = buildLogsQuery(pageOverride, overrides)
      const logsRes = await api.get(`/audit-logs?${query}`)
      setLogs(logsRes.data?.items || [])
      setLogsTotal(logsRes.data?.total || 0)
      setLogsPages(logsRes.data?.pages || 1)
      setLogsPage(logsRes.data?.page || pageOverride)
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar trilha de auditoria.')
    } finally {
      setLogsLoading(false)
    }
  }

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const fromIso = toIsoStart(fromDate)
      const toIso = toIsoEnd(toDate)
      const summaryQuery = new URLSearchParams()
      if (fromIso) summaryQuery.set('from', fromIso)
      if (toIso) summaryQuery.set('to', toIso)

      const [summaryRes, alertsRes, logsRes] = await Promise.all([
        api.get(`/audit-logs/summary${summaryQuery.toString() ? `?${summaryQuery.toString()}` : ''}`),
        api.get(`/audit-logs/alerts?lookbackHours=${lookbackHours}`),
        api.get(`/audit-logs?${buildLogsQuery(1)}`),
      ])
      setSummary(summaryRes.data)
      setAlerts(alertsRes.data)
      setLogs(logsRes.data?.items || [])
      setLogsTotal(logsRes.data?.total || 0)
      setLogsPages(logsRes.data?.pages || 1)
      setLogsPage(logsRes.data?.page || 1)
      setNotificationStatus(alertsRes.data?.notification || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao carregar dashboard de compliance.')
    } finally {
      setLoading(false)
    }
  }

  async function triggerHighAlert() {
    setAlertsLoading(true)
    setError('')
    try {
      const { data } = await api.get(
        `/audit-logs/alerts?lookbackHours=${lookbackHours}&notifyHigh=true&notifyCooldownMinutes=15`
      )
      setAlerts(data)
      setNotificationStatus(data.notification || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao disparar notificacao high.')
    } finally {
      setAlertsLoading(false)
    }
  }

  function downloadCsv(rows, filename) {
    const csv = [CSV_HEADER, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportCurrentLogsCsv() {
    const rows = logs.map(itemToCsvRow)
    downloadCsv(rows, `audit-logs-page-${logsPage}.csv`)
  }

  async function exportFilteredCsv() {
    setExporting(true)
    setError('')
    try {
      const allItems = []
      const maxPages = Math.min(logsPages, CSV_EXPORT_MAX_PAGES)
      for (let p = 1; p <= maxPages; p += 1) {
        const query = buildLogsQuery(p)
        const { data } = await api.get(`/audit-logs?${query}`)
        allItems.push(...(data?.items || []))
      }
      if (allItems.length === 0) {
        setError('Nenhum evento para exportar com os filtros atuais.')
        return
      }
      downloadCsv(
        allItems.map(itemToCsvRow),
        `audit-logs-filtrado-${new Date().toISOString().slice(0, 10)}.csv`
      )
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha ao exportar CSV.')
    } finally {
      setExporting(false)
    }
  }

  function applyLogFilters(e) {
    e.preventDefault()
    loadLogs(1)
  }

  function clearLogFilters() {
    setLogsAction('')
    setLogsStatus('')
    setLogsResourceType('')
    setLogsModule('')
    setLogsEventType('')
    setLogsIp('')
    setLogsClientApp('')
    loadLogs(1)
  }

  function filterByModule(mod) {
    setLogsModule(mod)
    loadLogs(1, { module: mod })
  }

  function printReport() {
    window.print()
  }

  function savePdfReport() {
    const reportWindow = window.open('', '_blank')
    if (!reportWindow) return
    const rows = logs
      .map(
        (item) => `<tr>
          <td>${fmtDate(item.createdAt)}</td>
          <td>${moduleLabel(item.module)}</td>
          <td>${item.eventType || ''}</td>
          <td>${item.action || ''}</td>
          <td>${item.actorName || item.actorEmail || ''}</td>
          <td>${item.status || ''}</td>
        </tr>`
      )
      .join('')
    reportWindow.document.write(`
      <html>
        <head>
          <title>Relatorio Compliance LGPD</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatorio Compliance — Trilha Forense</h1>
          <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          <p>Severidade: ${highestSeverity.toUpperCase()} | Acoes requeridas: ${requiresActionCount}</p>
          <table>
            <thead><tr><th>Data</th><th>Modulo</th><th>Tipo</th><th>Acao</th><th>Ator</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookbackHours])

  return (
    <section className={styles.dashboard}>
      <h2 className={styles.title}>Painel Forense — Compliance LGPD</h2>

      <div className={styles.toolbar}>
        <label htmlFor="lookback">Janela:</label>
        <select
          id="lookback"
          value={lookbackHours}
          onChange={(e) => setLookbackHours(Number(e.target.value))}
        >
          <option value={6}>6h</option>
          <option value={12}>12h</option>
          <option value={24}>24h</option>
          <option value={48}>48h</option>
          <option value={72}>72h</option>
        </select>
        <button type="button" onClick={loadDashboard} className={`${styles.btn} ${styles.btnPrimary}`}>
          Atualizar
        </button>
        <button
          type="button"
          onClick={triggerHighAlert}
          disabled={alertsLoading || highestSeverity !== 'high'}
          className={`${styles.btn} ${styles.btnWarn}`}
        >
          {alertsLoading ? 'Disparando...' : 'Disparar alerta HIGH'}
        </button>
        <button type="button" onClick={printReport} className={styles.btn}>
          Imprimir
        </button>
        <button type="button" onClick={savePdfReport} className={styles.btn}>
          Salvar em PDF
        </button>
        <label htmlFor="fromDate">De:</label>
        <input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <label htmlFor="toDate">Ate:</label>
        <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {error && <p className={styles.danger}>{error}</p>}
      {loading && <p>Carregando painel...</p>}

      <MonitoringAccessCard />

      {!loading && (
        <>
          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <strong>Severidade atual</strong>
              <div className={styles.metricValue} style={{ color: severityColor(highestSeverity), textTransform: 'uppercase' }}>{highestSeverity}</div>
            </div>
            <div className={styles.metricCard}>
              <strong>Acoes requeridas</strong>
              <div className={styles.metricValue}>{requiresActionCount}</div>
            </div>
            <div className={styles.metricCard}>
              <strong>Eventos</strong>
              <div className={styles.metricValue}>{summary?.totals?.events || 0}</div>
            </div>
            <div className={styles.metricCard}>
              <strong>Negados</strong>
              <div className={styles.metricValue}>{summary?.totals?.denied || 0}</div>
            </div>
          </div>

          {moduleBreakdown.length > 0 && (
            <div className={styles.panel}>
              <h3>Eventos por modulo</h3>
              <div className={styles.chipRow}>
                {moduleBreakdown.map((row) => (
                  <button
                    key={row.module}
                    type="button"
                    className={styles.chip}
                    onClick={() => filterByModule(row.module)}
                  >
                    {moduleLabel(row.module)}: {row.count}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.panel}>
            <h3>Status da notificacao</h3>
            <pre className={styles.pre}>
              {JSON.stringify(notificationStatus || { skipped: true }, null, 2)}
            </pre>
          </div>

          <div className={styles.panel}>
            <h3>Alertas priorizados</h3>
            {topAlertRows.length === 0 ? (
              <p className={styles.muted}>Nenhum alerta no periodo.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Severidade</th>
                      <th>Count</th>
                      <th>Acao recomendada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAlertRows.map((row, idx) => (
                      <tr key={`${row.type}-${idx}`}>
                        <td>{row.type}</td>
                        <td style={{ color: severityColor(row.severity) }}>
                          {String(row.severity || '-').toUpperCase()}
                        </td>
                        <td>{row.count ?? '-'}</td>
                        <td>{row.recommendedAction || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <h3>Trilha de auditoria (forense)</h3>
            <form onSubmit={applyLogFilters} className={styles.filterGrid}>
              <input
                type="text"
                placeholder="Acao (ex: pet.create)"
                value={logsAction}
                onChange={(e) => setLogsAction(e.target.value)}
              />
              <input
                type="text"
                placeholder="Recurso (ex: pet)"
                value={logsResourceType}
                onChange={(e) => setLogsResourceType(e.target.value)}
              />
              <select value={logsModule} onChange={(e) => setLogsModule(e.target.value)}>
                {MODULE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select value={logsEventType} onChange={(e) => setLogsEventType(e.target.value)}>
                {EVENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="IP"
                value={logsIp}
                onChange={(e) => setLogsIp(e.target.value)}
              />
              <select value={logsClientApp} onChange={(e) => setLogsClientApp(e.target.value)}>
                {CLIENT_APP_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select value={logsStatus} onChange={(e) => setLogsStatus(e.target.value)}>
                <option value="">Status (todos)</option>
                <option value="success">success</option>
                <option value="denied">denied</option>
                <option value="error">error</option>
              </select>
              <select value={logsLimit} onChange={(e) => setLogsLimit(Number(e.target.value))}>
                <option value={20}>20 / pagina</option>
                <option value={50}>50 / pagina</option>
                <option value={100}>100 / pagina</option>
              </select>
              <div className={styles.filterActions}>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Aplicar filtros
                </button>
                <button type="button" className={styles.btn} onClick={clearLogFilters}>
                  Limpar
                </button>
                <button type="button" className={styles.btn} onClick={exportCurrentLogsCsv} disabled={logs.length === 0}>
                  CSV (pagina)
                </button>
                <button type="button" className={styles.btn} onClick={exportFilteredCsv} disabled={exporting}>
                  {exporting ? 'Exportando...' : `CSV (ate ${CSV_EXPORT_MAX_PAGES} pag.)`}
                </button>
              </div>
            </form>
            <p className={styles.muted}>Total: {logsTotal} evento(s) — clique na linha para ver diff e contexto mobile</p>
            {logsLoading ? (
              <p>Carregando trilha...</p>
            ) : logs.length === 0 ? (
              <p className={styles.muted}>Sem eventos de auditoria no momento.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Modulo</th>
                      <th>Tipo</th>
                      <th>Acao</th>
                      <th>Ator</th>
                      <th>IP</th>
                      <th>Cliente</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((item) => (
                      <tr
                        key={item._id}
                        className={styles.clickableRow}
                        onClick={() => setSelectedEvent(item)}
                        title="Clique para detalhes forenses"
                      >
                        <td>{fmtDate(item.createdAt)}</td>
                        <td>{moduleLabel(item.module)}</td>
                        <td><span className={styles.badge}>{item.eventType || '-'}</span></td>
                        <td><code className={styles.actionCode}>{item.action}</code></td>
                        <td>{item.actorName || item.actorEmail || item.actorId || '-'}</td>
                        <td>{item.ip || '-'}</td>
                        <td>{clientSummary(item)}</td>
                        <td style={{ color: statusColor(item.status) }}>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.pagination}>
              <button className={styles.btn} type="button" onClick={() => loadLogs(Math.max(1, logsPage - 1))} disabled={logsPage <= 1 || logsLoading}>
                Anterior
              </button>
              <span>
                Pagina {logsPage} de {logsPages}
              </span>
              <button
                className={styles.btn}
                type="button"
                onClick={() => loadLogs(Math.min(logsPages, logsPage + 1))}
                disabled={logsPage >= logsPages || logsLoading}
              >
                Proxima
              </button>
            </div>
          </div>
        </>
      )}

      <AuditEventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </section>
  )
}
