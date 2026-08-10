import styles from './ComplianceDashboard.module.css'
import { moduleLabel, statusColor } from './auditConstants'

function fmtDate(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return String(value)
  }
}

function fmtValue(value) {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function AuditEventDetail({ event, onClose }) {
  if (!event) return null

  const client = event.client || {}
  const changes = Array.isArray(event.changes) ? event.changes : []
  const files = Array.isArray(event.files) ? event.files : []

  return (
    <div className={styles.detailOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.detailPanel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="audit-detail-title"
      >
        <div className={styles.detailHeader}>
          <h3 id="audit-detail-title">Detalhe forense</h3>
          <button type="button" className={styles.btn} onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className={styles.detailGrid}>
          <div><strong>Data</strong><span>{fmtDate(event.createdAt)}</span></div>
          <div><strong>Módulo</strong><span>{moduleLabel(event.module)}</span></div>
          <div><strong>Tipo</strong><span>{event.eventType || '-'}</span></div>
          <div><strong>Ação</strong><span>{event.action || '-'}</span></div>
          <div><strong>Status</strong><span style={{ color: statusColor(event.status) }}>{event.status || '-'}</span></div>
          <div><strong>Recurso</strong><span>{event.resourceType || '-'} {event.resourceId ? `(${event.resourceId})` : ''}</span></div>
          <div><strong>Ator</strong><span>{event.actorName || event.actorEmail || event.actorId || '-'}</span></div>
          <div><strong>Papel</strong><span>{event.actorRole || '-'}</span></div>
          <div><strong>IP</strong><span>{event.ip || '-'}</span></div>
          <div><strong>Rota</strong><span>{event.method || ''} {event.route || '-'}</span></div>
          <div><strong>Request ID</strong><span>{event.requestId || client.requestId || '-'}</span></div>
          <div><strong>Cliente</strong><span>{client.app || '-'} / {client.platform || '-'}</span></div>
          <div><strong>Versão app</strong><span>{client.version || '-'}</span></div>
          <div><strong>Tela</strong><span>{client.screen || '-'}</span></div>
        </div>

        {changes.length > 0 && (
          <div className={styles.detailSection}>
            <h4>Alterações (diff)</h4>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((row, idx) => (
                    <tr key={`${row.campo}-${idx}`}>
                      <td><code>{row.campo}</code></td>
                      <td className={styles.diffBefore}>{fmtValue(row.antes)}</td>
                      <td className={styles.diffAfter}>{fmtValue(row.depois)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className={styles.detailSection}>
            <h4>Arquivos</h4>
            <ul className={styles.fileList}>
              {files.map((f, idx) => (
                <li key={`${f.path || f.name}-${idx}`}>
                  {f.name || f.path} — {f.type || 'arquivo'} ({f.size != null ? `${f.size} bytes` : 'tamanho n/d'})
                </li>
              ))}
            </ul>
          </div>
        )}

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className={styles.detailSection}>
            <h4>Metadados</h4>
            <pre className={styles.pre}>{JSON.stringify(event.metadata, null, 2)}</pre>
          </div>
        )}

        {client.app === 'prefeitura_app' && (
          <p className={styles.muted}>
            Origem: aplicativo móvel Prefeitura ({client.platform || 'plataforma não informada'}).
          </p>
        )}
      </div>
    </div>
  )
}
