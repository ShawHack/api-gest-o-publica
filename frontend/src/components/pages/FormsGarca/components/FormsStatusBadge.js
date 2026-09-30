import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import styles from './FormsStatusBadge.module.css'

const STATUS_LABELS = {
  aberto: 'Aberto',
  rascunho: 'Rascunho',
  emAndamento: 'Em andamento',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
  publicado: 'Publicado',
  cancelado: 'Cancelado',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
}

const STATUS_CLASSES = {
  aberto: styles.statusAberto,
  rascunho: styles.statusRascunho,
  emAndamento: styles.statusEmAndamento,
  concluido: styles.statusConcluido,
  arquivado: styles.statusArquivado,
  publicado: styles.statusPublicado,
  cancelado: styles.statusCancelado,
  pendente: styles.statusPendente,
  confirmado: styles.statusConfirmado,
}

export default function FormsStatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  className = '',
}) {
  const normalizedStatus = String(status || '').trim()
  const displayLabel = label || STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Indefinido'
  const statusClass = STATUS_CLASSES[normalizedStatus] || styles.statusDefault
  const sizeClass = size === 'sm' ? styles.sizeSm : styles.sizeMd
  const isPublicado = normalizedStatus === 'publicado'

  return (
    <span
      className={`${styles.badge} ${sizeClass} ${statusClass} ${className}`}
      role="status"
    >
      {isPublicado ? (
        <CheckCircle2 size={size === 'sm' ? 12 : 14} aria-hidden="true" />
      ) : showDot ? (
        <span className={styles.dot} aria-hidden="true" />
      ) : null}
      <span>{displayLabel}</span>
    </span>
  )
}
