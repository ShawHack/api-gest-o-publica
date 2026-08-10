import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock,
  MapPin,
  Search,
  Users,
  X,
  CalendarX2,
} from 'lucide-react'
import { listCalendar, listUpcomingEvents } from '../../../services/educationService'
import { EVENT_LABELS, formatDateTime, getEventTypeColor, mediaUrl } from './educationUtils'
import { formatDateBr, formatSlotLabel } from './admin/calendarAdminUtils'
import { isMeetingType, meetingStatusLabel } from './admin/meetingAdminUtils'
import {
  CALENDAR_FILTER_GROUPS,
  excerpt,
  expandEventOccurrences,
  filterEvents,
  formatTimeRange,
  getUpcomingOccurrences,
  MONTH_NAMES,
} from './calendarViewUtils'
import styles from './CalendarView.module.css'

function occurrenceKey(occ) {
  return `${occ.event._id}-${occ.dateOnly}-${occ.startTime}`
}

function EventTypeBadge({ type }) {
  const meeting = isMeetingType(type)
  return (
    <span
      className={`${styles.typeBadge} ${meeting ? styles.typeBadgeMeeting : ''}`}
      style={{ '--badge-color': getEventTypeColor(type) }}
    >
      {meeting && <Users size={12} aria-hidden />}
      {EVENT_LABELS[type] || type}
    </span>
  )
}

function EventDetailModal({ event, onClose }) {
  if (!event) return null

  const slots = event.dateSlots?.length
    ? event.dateSlots.map((slot) => formatSlotLabel(slot))
    : event.startDate
      ? [formatDateTime(event.startDate)]
      : []

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="event-detail-title">
      <button type="button" className={styles.modalBackdrop} aria-label="Fechar" onClick={onClose} />
      <div className={styles.modalContent}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fechar detalhes">
          <X size={18} />
        </button>
        <EventTypeBadge type={event.type} />
        <h3 id="event-detail-title" className={styles.modalTitle}>{event.title}</h3>

        {event.description && (
          <div className={styles.modalSection}>
            <h4>{isMeetingType(event.type) ? 'Descrição / Pauta' : 'Descrição'}</h4>
            <p className={styles.modalText}>{event.description}</p>
          </div>
        )}

        <div className={styles.modalSection}>
          <h4>Data e horário</h4>
          <ul className={styles.slotList}>
            {slots.map((slot) => (
              <li key={slot}>{slot}</li>
            ))}
          </ul>
        </div>

        {event.location && (
          <div className={styles.modalSection}>
            <h4>Local</h4>
            <p className={styles.modalText}>{event.location}</p>
          </div>
        )}

        {event.responsible && (
          <div className={styles.modalSection}>
            <h4>Responsável</h4>
            <p className={styles.modalText}>{event.responsible}</p>
          </div>
        )}

        {event.educationEntityId?.name && (
          <div className={styles.modalSection}>
            <h4>{event.educationEntityId?.type === 'conselho' ? 'Conselho' : 'Unidade'}</h4>
            <p className={styles.modalText}>{event.educationEntityId.name}</p>
          </div>
        )}

        {isMeetingType(event.type) && (
          <div className={styles.modalSection}>
            <h4>Status</h4>
            <p className={styles.modalText}>{meetingStatusLabel(event.status, event.isPublic)}</p>
          </div>
        )}

        {event.attachments?.length > 0 && (
          <div className={styles.modalSection}>
            <h4>Documentos anexados</h4>
            <ul className={styles.slotList}>
              {event.attachments.map((file) => (
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

function EventCard({ occurrence, onDetails, variant = 'card' }) {
  const { event, dateOnly, startTime, endTime } = occurrence
  const day = dateOnly?.split('-')[2] || '—'
  const month = MONTH_NAMES[Number(dateOnly?.split('-')[1]) - 1]?.slice(0, 3) || ''
  const accent = getEventTypeColor(event.type)

  if (variant === 'row') {
    return (
      <article
        className={styles.agendaRow}
        style={{ '--card-accent': accent }}
      >
        <div className={styles.agendaRowTime}>
          <span className={styles.agendaRowClock}>{formatTimeRange(startTime, endTime)}</span>
        </div>
        <div className={styles.agendaRowBody}>
          <EventTypeBadge type={event.type} />
          <h4 className={styles.agendaRowTitle}>{event.title}</h4>
          {event.location && (
            <p className={styles.cardMeta}>
              <MapPin size={13} aria-hidden />
              {event.location}
            </p>
          )}
          {event.educationEntityId?.name && (
            <p className={styles.cardMeta}>{event.educationEntityId.name}</p>
          )}
        </div>
        <button type="button" className={styles.detailBtn} onClick={() => onDetails(event)}>
          Detalhes
        </button>
      </article>
    )
  }

  return (
    <article className={styles.upcomingCard} style={{ '--card-accent': accent }}>
      <div className={styles.dateBadge} aria-hidden>
        <strong>{day}</strong>
        <span>{month}</span>
      </div>
      <div className={styles.cardBody}>
        <EventTypeBadge type={event.type} />
        <h3 className={styles.cardTitle}>{event.title}</h3>
        <p className={styles.cardMeta}>
          <Clock size={14} aria-hidden />
          {formatDateBr(dateOnly)} · {formatTimeRange(startTime, endTime)}
        </p>
        {event.location && (
          <p className={styles.cardMeta}>
            <MapPin size={14} aria-hidden />
            {event.location}
          </p>
        )}
        {event.educationEntityId?.name && (
          <p className={styles.cardMeta}>{event.educationEntityId.name}</p>
        )}
        {event.description && (
          <p className={styles.cardExcerpt}>{excerpt(event.description)}</p>
        )}
        <button type="button" className={styles.detailBtn} onClick={() => onDetails(event)}>
          Ver detalhes
        </button>
      </div>
    </article>
  )
}

function getPeriodOccurrences(events, filters, limit = 200) {
  const all = []
  for (const event of filterEvents(events, filters)) {
    for (const occ of expandEventOccurrences(event)) {
      all.push(occ)
    }
  }
  return all.sort((a, b) => a.sortKey - b.sortKey).slice(0, limit)
}

function groupByDate(occurrences) {
  const groups = new Map()
  for (const occ of occurrences) {
    if (!groups.has(occ.dateOnly)) groups.set(occ.dateOnly, [])
    groups.get(occ.dateOnly).push(occ)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function CalendarView() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [futureOnly, setFutureOnly] = useState(true)
  const [detailEvent, setDetailEvent] = useState(null)
  const [monthEvents, setMonthEvents] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const filters = useMemo(
    () => ({ search: searchQuery, categoryId, futureOnly }),
    [searchQuery, categoryId, futureOnly]
  )

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = searchQuery.trim()
        ? { year, limit: 500 }
        : { month, year, limit: 200 }

      const [monthRes, upcomingRes] = await Promise.all([
        listCalendar(params),
        listUpcomingEvents(20),
      ])
      setMonthEvents(monthRes.data?.data || [])
      setUpcomingEvents(upcomingRes.data?.data || [])
    } catch {
      setMonthEvents([])
      setUpcomingEvents([])
    } finally {
      setLoading(false)
    }
  }, [month, year, searchQuery])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredMonthEvents = useMemo(
    () => filterEvents(monthEvents, filters),
    [monthEvents, filters]
  )

  const upcomingOccurrences = useMemo(() => {
    const fromUpcoming = getUpcomingOccurrences(upcomingEvents, 6, filters)
    if (fromUpcoming.length > 0) return fromUpcoming
    return getUpcomingOccurrences(monthEvents, 6, filters)
  }, [upcomingEvents, monthEvents, filters])

  const periodOccurrences = useMemo(
    () => getPeriodOccurrences(monthEvents, filters),
    [monthEvents, filters]
  )

  const upcomingKeys = useMemo(
    () => new Set(upcomingOccurrences.map(occurrenceKey)),
    [upcomingOccurrences]
  )

  const agendaGroups = useMemo(() => {
    const rest = periodOccurrences.filter((occ) => !upcomingKeys.has(occurrenceKey(occ)))
    return groupByDate(rest)
  }, [periodOccurrences, upcomingKeys])

  const yearOptions = Array.from({ length: 16 }, (_, i) => 2020 + i)
  const periodLabel = searchQuery.trim()
    ? `Resultados em ${year}`
    : `${MONTH_NAMES[month - 1]} de ${year}`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleBlock}>
            <span className={styles.titleKicker}>
              <CalendarDays size={16} aria-hidden />
              Agenda da rede municipal
            </span>
            <h2 className={styles.title}>Calendário educacional</h2>
            <p className={styles.subtitle}>
              Consulte reuniões, eventos e atividades programadas da educação municipal.
            </p>
          </div>
          {!loading && (
            <div className={styles.statsPill} aria-live="polite">
              <strong>{periodOccurrences.length}</strong>
              <span>agendamentos</span>
            </div>
          )}
        </div>

        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Pesquisar por evento, reunião, data ou local..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Pesquisar eventos"
          />
        </div>

        <div className={styles.filters}>
          <label className={styles.field}>
            Mês
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Ano
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Categoria
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {CALENDAR_FILTER_GROUPS.map((g) => (
                <option key={g.id || 'all'} value={g.id}>{g.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={futureOnly}
              onChange={(e) => setFutureOnly(e.target.checked)}
            />
            Apenas eventos futuros
          </label>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.loadingSpinner} aria-hidden />
          <p className={styles.loading}>Carregando agenda...</p>
        </div>
      ) : (
        <>
          {upcomingOccurrences.length > 0 && (
            <section className={styles.upcomingSection} aria-labelledby="upcoming-events-title">
              <div className={styles.sectionHeader}>
                <h3 id="upcoming-events-title" className={styles.sectionTitle}>
                  Próximos agendamentos
                </h3>
                <p className={styles.sectionHint}>Os {upcomingOccurrences.length} compromissos mais próximos</p>
              </div>
              <div className={styles.upcomingGrid}>
                {upcomingOccurrences.map((occ) => (
                  <EventCard
                    key={occurrenceKey(occ)}
                    occurrence={occ}
                    onDetails={setDetailEvent}
                  />
                ))}
              </div>
            </section>
          )}

          <section className={styles.agendaSection} aria-labelledby="period-agenda-title">
            <div className={styles.sectionHeader}>
              <h3 id="period-agenda-title" className={styles.sectionTitle}>
                Agenda do período
              </h3>
              <p className={styles.sectionHint}>{periodLabel}</p>
            </div>

            {periodOccurrences.length === 0 ? (
              <div className={styles.emptyState}>
                <CalendarX2 size={40} className={styles.emptyDayIcon} aria-hidden />
                <p>Nenhum evento encontrado para os filtros selecionados.</p>
              </div>
            ) : agendaGroups.length === 0 && upcomingOccurrences.length > 0 ? (
              <p className={styles.sectionHint}>
                Todos os agendamentos deste período estão listados acima em &quot;Próximos agendamentos&quot;.
              </p>
            ) : (
              <div className={styles.agendaGroups}>
                {agendaGroups.map(([dateOnly, items]) => (
                  <div key={dateOnly} className={styles.agendaDateGroup}>
                    <h4 className={styles.agendaDateHeading}>
                      {formatDateBr(dateOnly)}
                      <span className={styles.agendaDateCount}>{items.length} item(ns)</span>
                    </h4>
                    <div className={styles.agendaDateList}>
                      {items.map((occ) => (
                        <EventCard
                          key={occurrenceKey(occ)}
                          occurrence={occ}
                          onDetails={setDetailEvent}
                          variant="row"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  )
}
