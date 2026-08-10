import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  Copy,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  listAdminCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  duplicateCalendarEvent,
  activateCalendarEvent,
  deactivateCalendarEvent,
} from '../../../../services/educationService'
import {
  EVENT_LABELS,
  CALENDAR_STATUS_LABELS,
  getEventTypeColor,
} from '../educationUtils'
import {
  EMPTY_EVENT_FORM,
  eventToForm,
  buildCalendarEventFormData,
  formatAllSlots,
  validateEventForm,
} from './calendarAdminUtils'
import styles from './EducationAdminPortal.module.css'
import calStyles from './CalendarAdminPanel.module.css'

const STATUS_CLASS = {
  active: calStyles.statusActive,
  in_progress: calStyles.statusActive,
  inactive: calStyles.statusInactive,
  cancelled: calStyles.statusCancelled,
  completed: calStyles.statusCompleted,
}

function badgeStyle(color) {
  return {
    backgroundColor: `${color}18`,
    color,
    border: `1px solid ${color}40`,
  }
}

export default function CalendarAdminPanel({ schoolUnits = [], showMsg }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_EVENT_FORM })
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    entityId: '',
    status: '',
    fromDate: '',
    toDate: '',
  })

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listAdminCalendar({
        limit: 200,
        type: filters.type || undefined,
        entityId: filters.entityId || undefined,
        status: filters.status || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      })
      setEvents(res.data?.data || [])
    } catch {
      showMsg('Erro ao carregar eventos.', false)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [filters.type, filters.entityId, filters.status, filters.fromDate, filters.toDate, showMsg])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredEvents = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    if (!q) return events
    return events.filter((ev) => (
      ev.title?.toLowerCase().includes(q)
      || ev.description?.toLowerCase().includes(q)
      || ev.educationEntityId?.name?.toLowerCase().includes(q)
    ))
  }, [events, filters.q])

  function resetForm() {
    setForm({
      ...EMPTY_EVENT_FORM,
      dateSlots: [{ dateOnly: '', times: [{ startTime: '08:00', endTime: '10:00' }] }],
    })
    setEditingId(null)
    setShowForm(false)
  }

  function openNewEvent() {
    resetForm()
    setShowForm(true)
  }

  function startEdit(event) {
    setEditingId(event._id)
    setForm(eventToForm(event))
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateDateSlot(dateIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      dateSlots: prev.dateSlots.map((slot, i) => (
        i === dateIndex ? { ...slot, [field]: value } : slot
      )),
    }))
  }

  function updateTimeSlot(dateIndex, timeIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      dateSlots: prev.dateSlots.map((slot, i) => {
        if (i !== dateIndex) return slot
        return {
          ...slot,
          times: slot.times.map((time, j) => (
            j === timeIndex ? { ...time, [field]: value } : time
          )),
        }
      }),
    }))
  }

  function addDateSlot() {
    setForm((prev) => ({
      ...prev,
      dateSlots: [...prev.dateSlots, { dateOnly: '', times: [{ startTime: '08:00', endTime: '10:00' }] }],
    }))
  }

  function addTimeSlot(dateIndex) {
    setForm((prev) => ({
      ...prev,
      dateSlots: prev.dateSlots.map((slot, i) => (
        i === dateIndex
          ? { ...slot, times: [...slot.times, { startTime: '14:00', endTime: '16:00' }] }
          : slot
      )),
    }))
  }

  function removeDateSlot(dateIndex) {
    setForm((prev) => ({
      ...prev,
      dateSlots: prev.dateSlots.filter((_, i) => i !== dateIndex),
    }))
  }

  function removeTimeSlot(dateIndex, timeIndex) {
    setForm((prev) => ({
      ...prev,
      dateSlots: prev.dateSlots.map((slot, i) => {
        if (i !== dateIndex) return slot
        const times = slot.times.filter((_, j) => j !== timeIndex)
        return { ...slot, times: times.length ? times : [{ startTime: '08:00', endTime: '10:00' }] }
      }),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const error = validateEventForm(form)
    if (error) {
      showMsg(error, false)
      return
    }

    setSubmitting(true)
    try {
      const fd = buildCalendarEventFormData(form)
      if (editingId) {
        await updateCalendarEvent(editingId, fd)
        showMsg('Evento atualizado.')
      } else {
        await createCalendarEvent(fd)
        showMsg('Evento criado.')
      }
      resetForm()
      loadEvents()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao salvar evento.', false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDuplicate(event) {
    try {
      await duplicateCalendarEvent(event._id)
      showMsg('Evento duplicado.')
      loadEvents()
    } catch {
      showMsg('Erro ao duplicar evento.', false)
    }
  }

  async function handleToggleActive(event) {
    try {
      if (event.status === 'active') {
        await deactivateCalendarEvent(event._id)
        showMsg('Evento desativado.')
      } else {
        await activateCalendarEvent(event._id)
        showMsg('Evento ativado.')
      }
      loadEvents()
    } catch {
      showMsg('Erro ao alterar status.', false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover permanentemente este evento?')) return
    try {
      await deleteCalendarEvent(id)
      showMsg('Evento removido.')
      if (editingId === id) resetForm()
      loadEvents()
    } catch {
      showMsg('Erro ao remover evento.', false)
    }
  }

  return (
    <div className={`${styles.panel} ${calStyles.root}`}>
      <div className={calStyles.toolbar}>
        <div className={calStyles.toolbarText}>
          <h3>Calendário Escolar</h3>
          <p>Cadastre e gerencie eventos com datas e horários em formato de lista.</p>
        </div>
        {!showForm && (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={openNewEvent}>
            <CalendarPlus size={18} aria-hidden />
            Novo Evento
          </button>
        )}
      </div>

      <div className={calStyles.filterCard}>
        <div className={calStyles.filterGrid}>
          <div className={calStyles.searchField}>
          <Search size={18} className={calStyles.searchIcon} aria-hidden />
          <input
            className={calStyles.searchInput}
            type="search"
            placeholder="Pesquisar por título, descrição ou unidade..."
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            aria-label="Pesquisar eventos"
          />
        </div>
        <label className={styles.field}>
          Tipo
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Unidade
          <select value={filters.entityId} onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}>
            <option value="">Todas</option>
            {schoolUnits.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Status
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(CALENDAR_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Período — de
          <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
        </label>
        <label className={styles.field}>
          Período — até
          <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
        </label>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>
              {editingId ? 'Editar evento' : 'Novo evento'}
            </h4>
            <div className={styles.formRow}>
              <label className={`${styles.field} ${styles.formRowFull}`}>
                Título do evento *
                <input
                  required
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Ex.: Reunião de Pais"
                />
              </label>
              <label className={`${styles.field} ${styles.formRowFull}`}>
                Descrição
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Informações complementares sobre o evento (opcional)"
                />
              </label>
              <label className={styles.field}>
                Tipo do evento *
                <select required value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Unidade escolar
                <select value={form.educationEntityId} onChange={(e) => updateField('educationEntityId', e.target.value)}>
                  <option value="">Geral / Secretaria</option>
                  {schoolUnits.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={calStyles.dateSlotsHeader}>
              <h4 className={calStyles.sectionTitle} style={{ margin: 0 }}>Datas e horários</h4>
              <button type="button" className={calStyles.addLinkBtn} onClick={addDateSlot}>
                <Plus size={16} aria-hidden />
                Adicionar nova data
              </button>
            </div>

            <div className={calStyles.dateSlotsSection}>
              {form.dateSlots.map((slot, dateIndex) => (
                <div key={`date-${dateIndex}`} className={calStyles.dateBlock}>
                  <div className={calStyles.dateBlockTitle}>
                    <span>Data {dateIndex + 1}</span>
                    {form.dateSlots.length > 1 && (
                      <button type="button" className={styles.btn} onClick={() => removeDateSlot(dateIndex)}>
                        Remover data
                      </button>
                    )}
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.field}>
                      Data *
                      <input
                        type="date"
                        required
                        value={slot.dateOnly}
                        onChange={(e) => updateDateSlot(dateIndex, 'dateOnly', e.target.value)}
                      />
                    </label>
                  </div>
                  {slot.times.map((time, timeIndex) => (
                    <div key={`time-${dateIndex}-${timeIndex}`} className={calStyles.timeRow}>
                      <label className={styles.field}>
                        Hora de início *
                        <input
                          type="time"
                          required
                          value={time.startTime}
                          onChange={(e) => updateTimeSlot(dateIndex, timeIndex, 'startTime', e.target.value)}
                        />
                      </label>
                      <label className={styles.field}>
                        Hora de término *
                        <input
                          type="time"
                          required
                          value={time.endTime}
                          onChange={(e) => updateTimeSlot(dateIndex, timeIndex, 'endTime', e.target.value)}
                        />
                      </label>
                      <div className={calStyles.timeRowActions}>
                        {slot.times.length > 1 && (
                          <button
                            type="button"
                            className={styles.btn}
                            onClick={() => removeTimeSlot(dateIndex, timeIndex)}
                            aria-label="Remover horário"
                          >
                            <X size={16} aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button type="button" className={calStyles.addLinkBtn} onClick={() => addTimeSlot(dateIndex)}>
                    <Plus size={16} aria-hidden />
                    Adicionar novo horário
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
              {submitting ? 'Salvando...' : (editingId ? 'Salvar alterações' : 'Criar evento')}
            </button>
            <button type="button" className={styles.btn} onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      )}

      <div>
        <h4 className={calStyles.sectionTitle}>Eventos cadastrados</h4>
        {loading ? (
          <p className={styles.muted}>Carregando eventos...</p>
        ) : filteredEvents.length === 0 ? (
          <div className={calStyles.emptyState}>Nenhum evento encontrado.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Datas e horários</th>
                  <th>Tipo</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  const color = ev.color || getEventTypeColor(ev.type)
                  const status = ev.status || 'active'
                  const slots = formatAllSlots(ev)
                  return (
                    <tr key={ev._id}>
                      <td>
                        <div className={calStyles.cellTitle}>{ev.title}</div>
                        {ev.description && (
                          <p className={calStyles.cellDesc}>{ev.description}</p>
                        )}
                      </td>
                      <td>
                        <ul className={calStyles.slotLines}>
                          {slots.map((line) => (
                            <li key={`${ev._id}-${line}`}>{line}</li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <span className={calStyles.typeBadge} style={badgeStyle(color)}>
                          {EVENT_LABELS[ev.type] || ev.type}
                        </span>
                      </td>
                      <td>{ev.educationEntityId?.name || 'Geral / Secretaria'}</td>
                      <td>
                        <span className={`${calStyles.statusBadge} ${STATUS_CLASS[status] || ''}`}>
                          {CALENDAR_STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button type="button" className={styles.btn} onClick={() => startEdit(ev)} title="Editar">
                            <Pencil size={14} aria-hidden />
                            Editar
                          </button>
                          <button type="button" className={styles.btn} onClick={() => handleDuplicate(ev)} title="Duplicar">
                            <Copy size={14} aria-hidden />
                            Duplicar
                          </button>
                          <button type="button" className={styles.btn} onClick={() => handleToggleActive(ev)} title={status === 'active' ? 'Desativar' : 'Ativar'}>
                            <Power size={14} aria-hidden />
                            {status === 'active' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button type="button" className={styles.btn} onClick={() => handleDelete(ev._id)} title="Remover">
                            <Trash2 size={14} aria-hidden />
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
