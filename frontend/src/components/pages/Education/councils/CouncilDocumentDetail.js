import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { getDocument } from '../../../../services/educationService'
import {
  DOCUMENT_TYPE_LABELS,
  MEETING_TYPE_LABELS,
  councilBasePath,
} from '../councilUtils'
import { EVENT_LABELS, formatDate, formatDateTime, mediaUrl } from '../educationUtils'
import styles from '../EducationPortal.module.css'

export default function CouncilDocumentDetail() {
  const { id } = useParams()
  const { slug } = useOutletContext()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getDocument(id)
      .then(({ data }) => setDoc(data?.data || null))
      .catch(() => {
        setDoc(null)
        setError('Documento não encontrado.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (error || !doc) return <div className={styles.error}>{error}</div>

  const base = councilBasePath(slug)

  return (
    <section className={styles.council_section}>
      <p><Link to={`${base}/documentos`}>← Voltar para documentos</Link></p>
      <span className={styles.badge}>
        {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
      </span>
      <h3 className={styles.subsection_title}>{doc.title}</h3>
      <div className={styles.meta_list}>
        <div><strong>Publicado em:</strong> {formatDate(doc.publishedAt || doc.createdAt)}</div>
        {doc.meetingDate && (
          <div><strong>Data da reunião:</strong> {formatDate(doc.meetingDate)}</div>
        )}
        {doc.meetingType && (
          <div><strong>Tipo:</strong> {MEETING_TYPE_LABELS[doc.meetingType] || doc.meetingType}</div>
        )}
        {doc.sessionNumber && (
          <div><strong>Sessão:</strong> {doc.sessionNumber}</div>
        )}
        {doc.referenceYear && (
          <div><strong>Ano de referência:</strong> {doc.referenceYear}</div>
        )}
        {doc.calendarEventId && (
          <div>
            <strong>Reunião vinculada:</strong>{' '}
            <Link to={`${base}/reunioes`}>
              {doc.calendarEventId.title || 'Ver calendário'}
              {doc.calendarEventId.startDate && ` — ${formatDateTime(doc.calendarEventId.startDate)}`}
            </Link>
            {doc.calendarEventId.type && (
              <span className={styles.muted}> ({EVENT_LABELS[doc.calendarEventId.type] || doc.calendarEventId.type})</span>
            )}
          </div>
        )}
      </div>
      {doc.description && <p className={styles.prose}>{doc.description}</p>}
      <a
        href={mediaUrl(doc.fileUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.btn} ${styles.btn_primary}`}
      >
        Baixar documento (v{doc.version || 1})
      </a>

      {doc.previousVersions?.length > 0 && (
        <>
          <h4 className={styles.subsection_title} style={{ marginTop: '1.5rem' }}>Versões anteriores</h4>
          <ul className={styles.doc_list}>
            {doc.previousVersions.slice().reverse().map((ver, idx) => (
              <li key={`${ver.version}-${idx}`}>
                <article className={styles.doc_list_item}>
                  <span className={styles.muted}>Versão {ver.version} · {formatDate(ver.replacedAt)}</span>
                  <a href={mediaUrl(ver.fileUrl)} target="_blank" rel="noopener noreferrer" className={styles.section_link_inline}>
                    Download
                  </a>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
