import { useEffect, useState } from 'react'
import api from '../../../utils/api'
import styles from './ComplianceDashboard.module.css'

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" className={styles.copyBtn} onClick={handleCopy} title={`Copiar ${label}`}>
      {copied ? '✓' : 'Copiar'}
    </button>
  )
}

function CredentialField({ label, value }) {
  return (
    <div className={styles.credentialField}>
      <span className={styles.credentialLabel}>{label}</span>
      <div className={styles.credentialValue}>
        <code>{value}</code>
        <CopyButton value={value} label={label.toLowerCase()} />
      </div>
    </div>
  )
}

function ToolCard({ tool, variant }) {
  const isGrafana = variant === 'grafana'

  return (
    <article className={`${styles.monitorCard} ${styles[`monitorCard${variant}`]}`}>
      <div className={styles.monitorCardTop}>
        <div className={styles.monitorBrand}>
          <span className={styles.monitorBadge}>{isGrafana ? 'G' : 'P'}</span>
          <div>
            <h4>{tool.name}</h4>
            <p className={styles.monitorSubtitle}>
              {isGrafana ? 'Gráficos e alertas visuais' : 'Consultas e diagnóstico técnico'}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.monitorActions}>
        <a href={tool.url} target="_blank" rel="noopener noreferrer" className={styles.monitorBtnOutline}>
          Abrir {tool.name}
        </a>
        {isGrafana && tool.dashboardUrl && (
          <a
            href={tool.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.monitorBtnPrimary}
          >
            Dashboard forense
          </a>
        )}
      </div>

      {isGrafana ? (
        <div className={styles.credentialGrid}>
          <CredentialField label="Usuário" value={tool.username} />
          <CredentialField label="Senha" value={tool.password} />
        </div>
      ) : (
        <p className={styles.monitorHint}>Sem login — rede interna da prefeitura.</p>
      )}

      {isGrafana && tool.passwordIsDefault && (
        <p className={styles.monitorWarn}>
          Senha padrão. Altere <code>GRAFANA_ADMIN_PASSWORD</code> no <code>.env</code>.
        </p>
      )}

      <details className={styles.monitorDetails}>
        <summary>Como usar o {tool.name}</summary>
        <ol className={styles.monitorSteps}>
          {tool.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>

      {!isGrafana && tool.sampleQueries?.length > 0 && (
        <div className={styles.queryChips}>
          <span className={styles.queryChipsLabel}>Consultas (aba Graph)</span>
          <div className={styles.queryChipsRow}>
            {tool.sampleQueries.map((q) => (
              <code key={q} className={styles.queryChip}>{q}</code>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export default function MonitoringAccessCard() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/audit-logs/monitoring-info')
      .then(({ data }) => {
        if (active) setInfo(data)
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.message || 'Falha ao carregar links de monitoramento.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className={`${styles.panel} ${styles.monitorPanel}`}>
        <div className={styles.monitorPanelHead}>
          <h3>Monitoramento operacional</h3>
        </div>
        <p className={styles.muted}>Carregando Grafana e Prometheus...</p>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className={`${styles.panel} ${styles.monitorPanel}`}>
        <div className={styles.monitorPanelHead}>
          <h3>Monitoramento operacional</h3>
        </div>
        <p className={styles.danger}>{error || 'Informações indisponíveis.'}</p>
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${styles.monitorPanel}`}>
      <div className={styles.monitorPanelHead}>
        <div>
          <h3>Monitoramento operacional</h3>
          <p className={styles.monitorLead}>{info.accessNote}</p>
        </div>
      </div>

      <p className={styles.monitorFootnote}>{info.complianceNote}</p>

      <details className={styles.monitorDetailsAdvanced}>
        <summary>Acesso remoto via SSH (opcional)</summary>
        <div className={styles.sshCommands}>
          <div className={styles.sshCommand}>
            <span>Grafana</span>
            <code>{info.sshTunnel.grafana}</code>
            <CopyButton value={info.sshTunnel.grafana} label="túnel Grafana" />
          </div>
          <div className={styles.sshCommand}>
            <span>Prometheus</span>
            <code>{info.sshTunnel.prometheus}</code>
            <CopyButton value={info.sshTunnel.prometheus} label="túnel Prometheus" />
          </div>
        </div>
      </details>

      <div className={styles.monitorGrid}>
        <ToolCard tool={info.grafana} variant="grafana" />
        <ToolCard tool={info.prometheus} variant="prometheus" />
      </div>
    </div>
  )
}
