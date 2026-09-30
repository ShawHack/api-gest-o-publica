import React, { useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import FormsStatusBadge from './FormsStatusBadge'
import styles from './FormsEventHeader.module.css'

function formatDate(dateString) {
  if (!dateString) return null
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function FormsEventHeader({
  event,
  onBack,
  className = '',
}) {
  const [copied, setCopied] = useState(false)

  if (!event) return null

  const publicUrl = event.slug
    ? `${window.location.origin}/formularios/evento/${event.slug}`
    : ''

  const formattedDate = formatDate(event.dataEvento)

  const handleCopyLink = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }).catch(() => {})
  }

  return (
    <header className={`${styles.eventHeader} ${className}`}>
      <div className={styles.leftCol}>
        {onBack && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label="Voltar para a lista de Meus Eventos"
            title="Voltar para a lista de Meus Eventos"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Eventos</span>
          </button>
        )}

        <div className={styles.titleArea}>
          <h2 className={styles.eventTitle} title={event.titulo}>
            {event.titulo || 'Evento sem título'}
          </h2>

          <FormsStatusBadge status={event.status} size="sm" />

          {event.publicado && (
            <FormsStatusBadge status="publicado" size="sm" label="Publicado" />
          )}

          {formattedDate && (
            <span className={styles.dateBadge}>
              <Calendar size={13} aria-hidden="true" />
              <span>{formattedDate}</span>
            </span>
          )}
        </div>
      </div>

      <div className={styles.rightActions}>
        {publicUrl && (
          <>
            <button
              type="button"
              className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ''}`}
              onClick={handleCopyLink}
              title="Copiar link da página pública"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copiado!' : 'Copiar link'}</span>
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionBtn}
              title="Abrir página pública do cidadão em nova aba"
            >
              <ExternalLink size={14} />
              <span>Ver como cidadão</span>
            </a>
          </>
        )}
      </div>
    </header>
  )
}
