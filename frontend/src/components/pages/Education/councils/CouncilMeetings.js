import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Clock, MapPin, User, X } from 'lucide-react'
import { listCalendar } from '../../../../services/educationService'
import { EVENT_LABELS, formatDateTime, mediaUrl } from '../educationUtils'
import { isMeetingType, meetingStatusLabel, formatMeetingTimesDisplay } from '../admin/meetingAdminUtils'
import { formatDateBr } from '../admin/calendarAdminUtils'
import { formatTimeRange } from '../calendarViewUtils'
import styles from '../EducationPortal.module.css'

function MeetingDetailModal({ meeting, council, onClose }) {
  if (!meeting) return null

  return (
    <div className={styles.modal_overlay} role="dialog" aria-modal="true">
      <button type="button" className={styles.modal_backdrop} aria-label="Fechar" onClick={onClose} />
      <div className={styles.modal_card} style={{ maxWidth: 560 }}>
        <button type="button" className={styles.modal_close} onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <span className={styles.badge} style={{ background: '#ea580c', color: '#fff' }}>
          {EVENT_LABELS[meeting.type] || 'Reunião'}
        </span>
        <h3 style={{ marginTop: '0.75rem' }}>{meeting.title}</h3>
        <p className={styles.muted}>
          <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {formatDateBr(meeting.startDateOnly)} · {formatTimeRange(meeting.startTime, meeting.endTime)}
        </p>
        {meeting.location && (
          <p className={styles.muted}>
            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {meeting.location}
          </p>
        )}
        {council?.name && (
          <p className={styles.muted}>Conselho: {council.name}</p>
        )}
        {meeting.responsible && (
          <p className={styles.muted}>
            <User size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Responsável: {meeting.responsible}
          </p>
        )}
        <p className={styles.muted}>
          Status: {meetingStatusLabel(meeting.status, meeting.isPublic)}
        </p>
        {meeting.description && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem' }}>Descrição / Pauta</h4>
            <p>{meeting.description}</p>
          </div>
        )}
        {meeting.attachments?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem' }}>Documentos anexados</h4>
            <ul>
              {meeting.attachments.map((file) => (
                <li key={file.filename || file.url}>
                  <a href={mediaUrl(file.url)} target="_blank" rel="noopener noreferrer">
                    {file.originalName || file.filename || 'Download'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CouncilMeetings() {
  const { slug, council } = useOutletContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    setLoading(true)
    listCalendar({ entitySlug: slug, limit: 200 })
      .then(({ data }) => {
        const all = data?.data || []
        setItems(all.filter((ev) => isMeetingType(ev.type)))
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((ev) => (
      ev.title?.toLowerCase().includes(term)
      || ev.description?.toLowerCase().includes(term)
      || ev.location?.toLowerCase().includes(term)
      || ev.responsible?.toLowerCase().includes(term)
    ))
  }, [items, search])

  return (
    <section className={styles.council_section}>
      <p className={styles.section_lead}>
        Reuniões publicadas deste conselho. Todas aparecem também no calendário educacional.
      </p>
      <div className={styles.doc_filters}>
        <label className={styles.field}>
          Buscar
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Título, local ou responsável..."
          />
        </label>
      </div>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {items.length === 0
            ? 'Nenhuma reunião publicada para este conselho.'
            : 'Nenhuma reunião corresponde à busca.'}
        </div>
      ) : (
        <>
          <p className={styles.muted}>{filtered.length} reunião(ões)</p>
          <div className={styles.event_list}>
            {filtered.map((ev) => (
              <article key={ev._id} className={styles.event_item}>
                <div className={styles.event_body}>
                  <span className={styles.badge} style={{ background: '#ea580c', color: '#fff' }}>
                    {EVENT_LABELS[ev.type] || 'Reunião'}
                  </span>
                  <h3 className={styles.event_title}>{ev.title}</h3>
                  <p className={styles.muted}>
                    {ev.startDateOnly
                      ? `${ev.startDateOnly.split('-').reverse().join('/')} · ${formatMeetingTimesDisplay(ev)}`
                      : formatDateTime(ev.startDate)}
                  </p>
                  {ev.location && <p className={styles.muted}>{ev.location}</p>}
                  {ev.responsible && <p className={styles.muted}>Responsável: {ev.responsible}</p>}
                  <button type="button" className={styles.btn} onClick={() => setDetail(ev)}>
                    Ver detalhes
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <MeetingDetailModal meeting={detail} council={council} onClose={() => setDetail(null)} />
    </section>
  )
}
