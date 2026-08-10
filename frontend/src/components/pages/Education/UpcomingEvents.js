import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { listUpcomingEvents } from '../../../services/educationService'
import { EVENT_LABELS, formatDateTime } from './educationUtils'
import styles from './EducationPortal.module.css'

function eventDayParts(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return { day: '—', month: '' }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  }
}

export default function UpcomingEvents({ limit = 5, showHeader = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listUpcomingEvents(limit)
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [limit])

  if (loading) {
    if (!showHeader) return <div className={styles.loading}>Carregando eventos...</div>
    return null
  }

  if (items.length === 0) return null

  const content = (
    <div className={styles.event_list}>
      {items.map((ev) => {
        const { day, month } = eventDayParts(ev.startDate)
        return (
          <article key={ev._id} className={styles.event_item}>
            <div className={styles.event_date_badge} aria-hidden>
              <strong>{day}</strong>
              <span>{month}</span>
            </div>
            <div className={styles.event_body}>
              <span className={styles.badge}>{EVENT_LABELS[ev.type] || ev.type}</span>
              <h3 className={styles.event_title}>{ev.title}</h3>
              <p className={styles.muted}>{formatDateTime(ev.startDate)}</p>
              {ev.location && <p className={styles.muted}>{ev.location}</p>}
              {ev.educationEntityId?.name && (
                <p className={styles.muted}>{ev.educationEntityId.name}</p>
              )}
            </div>
          </article>
        )
      })}
      <Link to="/educacao/calendario" className={styles.section_link_inline}>
        <CalendarDays size={16} aria-hidden />
        Ver calendário completo
      </Link>
    </div>
  )

  if (!showHeader) return content

  return (
    <section className={styles.home_section}>
      <div className={styles.section_header}>
        <h2 className={styles.section_title}>Próximos eventos</h2>
        <Link to="/educacao/calendario" className={styles.section_link}>Calendário</Link>
      </div>
      {content}
    </section>
  )
}
