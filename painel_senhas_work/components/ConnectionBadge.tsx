import type { ConnectionStatus } from '../types/config'
import './ConnectionBadge.css'

const LABELS: Record<ConnectionStatus, string> = {
  idle: 'Aguardando',
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  disconnected: 'Desconectado',
  config_error: 'Configuração',
  auth_error: 'Autenticação',
}

export function ConnectionBadge({
  status,
  detail,
}: {
  status: ConnectionStatus
  detail?: string
}) {
  return (
    <div className={`connection-badge connection-badge--${status}`} title={detail || LABELS[status]}>
      <span className="connection-badge__dot" aria-hidden />
      <span className="connection-badge__label">{LABELS[status]}</span>
    </div>
  )
}
