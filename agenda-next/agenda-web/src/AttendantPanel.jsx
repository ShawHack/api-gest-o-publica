import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const statusMap = {
  booked: { label: 'Agendado', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  confirmed: { label: 'Em Atendimento / Confirmado', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  completed: { label: 'Atendido', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  no_show: { label: 'Ausente', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  cancelled: { label: 'Cancelado', color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function monthCells(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const last = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday }, () => null)
  for (let day = 1; day <= last; day += 1) cells.push(day)
  while (cells.length % 7) cells.push(null)
  return cells
}

function clock(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function cleanPhone(val) {
  return String(val || '').replace(/\D/g, '')
}

function prefsStorageKey(userId) {
  return userId ? `attendant_panel_prefs_${userId}` : 'attendant_panel_prefs'
}

function readStoredPrefs(userId) {
  try {
    const raw = localStorage.getItem(prefsStorageKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoredPrefs(userId, prefs) {
  if (!userId) return
  localStorage.setItem(prefsStorageKey(userId), JSON.stringify(prefs))
}

function resolveOperatorDefaults({ me, agenda, services, resources, stored }) {
  const saved = stored || {}
  const myResources = resources.filter((resource) => {
    if (!resource.active || resource.type !== 'attendant') return false
    const linkedUser = String(resource.userId?._id || resource.userId || '')
    if (me?._id && linkedUser && linkedUser === String(me._id)) return true
    const email = String(resource.email || '').trim().toLowerCase()
    return email && me?.email && email === String(me.email).trim().toLowerCase()
  })

  const myResource = myResources[0]
  if (myResource) {
    const unit = String(myResource.unitId?._id || myResource.unitId || '')
    const linkedServices = services.filter((service) => {
      if (String(service.unitId?._id || service.unitId) !== unit) return false
      return (service.resourceIds || []).some((entry) => String(entry._id || entry) === String(myResource._id))
    })
    return {
      unitId: unit || saved.unitId || '',
      serviceId: linkedServices.length === 1
        ? String(linkedServices[0]._id)
        : (saved.serviceId && linkedServices.some((item) => String(item._id) === saved.serviceId) ? saved.serviceId : ''),
      resourceId: saved.resourceId || '',
    }
  }

  const attendantUnits = [...new Set(
    (agenda?.assignments || [])
      .filter((item) => item.role === 'agenda_attendant' && item.unitId)
      .map((item) => String(item.unitId?._id || item.unitId)),
  )]

  if (attendantUnits.length === 1) {
    const unit = attendantUnits[0]
    const unitServices = services.filter((service) => String(service.unitId?._id || service.unitId) === unit)
    return {
      unitId: unit,
      serviceId: unitServices.length === 1 ? String(unitServices[0]._id) : (saved.serviceId || ''),
      resourceId: saved.resourceId || '',
    }
  }

  return {
    unitId: saved.unitId || '',
    serviceId: saved.serviceId || '',
    resourceId: saved.resourceId || '',
  }
}

export default function AttendantPanel({ agenda, me }) {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [date, setDate] = useState(todayKey())
  const [days, setDays] = useState({})
  const [items, setItems] = useState([])
  const [services, setServices] = useState([])
  const [resources, setResources] = useState([])
  const [units, setUnits] = useState([])
  const [panels, setPanels] = useState([])
  const [unitId, setUnitId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [search, setSearch] = useState('')
  const [includeDone, setIncludeDone] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [localType, setLocalType] = useState(() => localStorage.getItem('attendant_local_type') || 'Guichê')
  const [localNumber, setLocalNumber] = useState(() => localStorage.getItem('attendant_local_number') || '1')
  const [callNotice, setCallNotice] = useState('')
  const [prefsReady, setPrefsReady] = useState(false)

  useEffect(() => {
    localStorage.setItem('attendant_local_type', localType)
  }, [localType])

  useEffect(() => {
    localStorage.setItem('attendant_local_number', localNumber)
  }, [localNumber])

  useEffect(() => {
    if (!prefsReady || !me?._id) return
    writeStoredPrefs(me._id, { unitId, serviceId, resourceId })
  }, [unitId, serviceId, resourceId, me?._id, prefsReady])

  const canManage = agenda?.isGlobalAdmin || agenda?.assignments?.some((item) => ['agenda_admin', 'agenda_manager'].includes(item.role))

  const userServices = useMemo(() => {
    if (unitId) {
      return services.filter((s) => String(s.unitId?._id || s.unitId) === String(unitId))
    }
    return services
  }, [services, unitId])

  const month = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
  const cells = monthCells(cursor.year, cursor.month)
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (unitId) params.set('unitId', unitId)
    if (serviceId) params.set('serviceId', serviceId)
    return params.toString()
  }, [unitId, serviceId])

  const loadMonth = useCallback(async () => {
    const extra = query ? `&${query}` : ''
    const data = await api(`/api/agenda/admin/appointments/calendar?month=${month}${extra}`)
    setDays(data.days || {})
  }, [month, query])

  const loadDay = useCallback(async (key) => {
    const extra = query ? `&${query}` : ''
    const statusParam = includeDone ? '' : '&status=booked,confirmed'
    const data = await api(`/api/agenda/admin/appointments?dateFrom=${key}T00:00:00.000-03:00&dateTo=${key}T23:59:59.999-03:00&page=1&limit=200${statusParam}${extra}`)
    setItems(data.items || [])
  }, [query, includeDone])

  useEffect(() => {
    let alive = true
    setBusy(true)
    setError('')
    loadMonth()
      .catch((err) => { if (alive) setError(err.message) })
      .finally(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [loadMonth])

  useEffect(() => {
    let alive = true
    const key = date.startsWith(month) ? date : `${month}-01`
    if (key !== date) {
      setDate(key)
      return
    }
    setBusy(true)
    loadDay(key)
      .catch((err) => { if (alive) { setError(err.message); setItems([]) } })
      .finally(() => { if (alive) setBusy(false) })
    return () => { alive = false }
  }, [date, month, loadDay])

  useEffect(() => {
    let alive = true
    Promise.all([
      api('/api/agenda/services'),
      api('/api/agenda/admin/units').catch(() => ({ items: [] })),
      api('/api/agenda/admin/resources'),
      api('/api/agenda/panels').catch(() => ({ items: [] })),
    ]).then(([catalog, unitsData, resourcesData, panelsData]) => {
      if (!alive) return
      const serviceItems = catalog.items || []
      const resourceItems = resourcesData.items || []
      setServices(serviceItems)
      setResources(resourceItems)
      setPanels(panelsData.items || [])

      const unitMap = new Map()
      for (const item of serviceItems) {
        const unit = item.unitId
        if (unit?._id) unitMap.set(String(unit._id), unit)
      }
      for (const item of unitsData.items || []) {
        if (item?._id) unitMap.set(String(item._id), item)
      }
      setUnits([...unitMap.values()])

      const defaults = resolveOperatorDefaults({
        me,
        agenda,
        services: serviceItems,
        resources: resourceItems,
        stored: readStoredPrefs(me?._id),
      })
      if (defaults.unitId) setUnitId(defaults.unitId)
      if (defaults.serviceId) setServiceId(defaults.serviceId)
      if (defaults.resourceId) setResourceId(defaults.resourceId)
      setPrefsReady(true)
    }).catch(() => {
      if (!alive) return
      setServices([])
      setPrefsReady(true)
    })
    return () => { alive = false }
  }, [agenda, me])

  async function refresh() {
    setBusy(true)
    setError('')
    try {
      await loadMonth()
      await loadDay(date)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function callInPanel(item) {
    if (!item) return
    setActionBusy(true)
    try {
      const citizenName = item.identitySnapshot?.name || item.userId?.name || 'Cidadão'
      const res = await api(`/api/agenda/admin/appointments/${item._id}/call`, {
        method: 'POST',
        body: JSON.stringify({
          localName: localType,
          localNumber: Number(localNumber) || 1,
        }),
      })
      const panelInfo = res.service?.panelSlug ? `[Painel: ${res.service.panelSlug.toUpperCase()}]` : ''
      setCallNotice(`📢 Chamando na TV ${panelInfo}: ${res.call?.senha || 'AG'} (${citizenName}) ➔ ${localType} ${localNumber}`)
      setTimeout(() => setCallNotice(''), 8000)
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Erro ao acionar chamada no painel.')
    } finally {
      setActionBusy(false)
    }
  }

  async function transition(id, status, { skipConfirm = false } = {}) {
    const labels = { confirmed: 'iniciar / confirmar', completed: 'concluir como atendido', no_show: 'marcar como ausente', cancelled: 'cancelar' }
    if (!skipConfirm && !window.confirm(`Deseja ${labels[status] || status} este atendimento?`)) return
    setActionBusy(true)
    try {
      await api(`/api/agenda/admin/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await refresh()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setActionBusy(false)
    }
  }

  function allowedStatusOptions(currentStatus) {
    const map = {
      booked: ['booked', 'confirmed', 'cancelled'],
      confirmed: ['confirmed', 'completed', 'no_show', 'cancelled'],
      completed: ['completed', 'confirmed'],
      no_show: ['no_show', 'confirmed'],
      cancelled: ['cancelled', 'confirmed'],
    }
    return map[currentStatus] || [currentStatus]
  }

  // Filtro por Atendente e Busca textual
  const filteredItems = useMemo(() => {
    let list = items
    if (resourceId) {
      list = list.filter((item) => {
        const itemResId = String(item.resourceId?._id || item.resourceId || '')
        // 1. Se o agendamento foi atribuído especificamente a este atendente:
        if (itemResId && itemResId === String(resourceId)) return true

        // 2. Se o agendamento pertence a um serviço em que o atendente selecionado integra a equipe:
        const srv = services.find((s) => String(s._id) === String(item.serviceId?._id || item.serviceId))
        if (srv && (srv.resourceIds || []).some((r) => String(r._id || r) === String(resourceId))) {
          return true
        }

        // 3. Se o serviço não possui restrição de atendentes (fila aberta):
        if (!srv || !(srv.resourceIds || []).length) return true

        return false
      })
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((item) => {
        const name = (item.identitySnapshot?.name || item.userId?.name || '').toLowerCase()
        const cpf = (item.identitySnapshot?.cpf || item.userId?.cpf || '').toLowerCase()
        const protocol = (item.protocol || '').toLowerCase()
        const phone = (item.identitySnapshot?.phone || item.userId?.phone || '').toLowerCase()
        return name.includes(q) || cpf.includes(q) || protocol.includes(q) || phone.includes(q)
      })
    }
    return list
  }, [items, resourceId, search, services])

  // Métricas do dia selecionado (alinhadas à fila visível)
  const metrics = useMemo(() => {
    const base = filteredItems
    const total = base.length
    const booked = base.filter((i) => i.status === 'booked').length
    const confirmed = base.filter((i) => i.status === 'confirmed').length
    const completed = base.filter((i) => i.status === 'completed').length
    const noShow = base.filter((i) => i.status === 'no_show').length
    const cancelled = base.filter((i) => i.status === 'cancelled').length
    return { total, booked, confirmed, completed, noShow, cancelled, pending: booked + confirmed }
  }, [filteredItems])

  function callNext() {
    const next = filteredItems.find((item) => ['booked', 'confirmed'].includes(item.status))
    if (next) {
      setExpandedId(next._id)
      const el = document.getElementById(`appointment-${next._id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      callInPanel(next)
    } else {
      window.alert('Não há nenhum atendimento aguardando na fila deste dia.')
    }
  }

  function goToToday() {
    const today = todayKey()
    const [y, m] = today.split('-').map(Number)
    setCursor({ year: y, month: m - 1 })
    setDate(today)
  }

  const dayLabel = date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const tvPanelSlug = useMemo(() => {
    const fromAppt = items.find((item) => item.serviceId?.panelSlug)?.serviceId?.panelSlug
    if (fromAppt) return fromAppt
    const unitSlug = units.find((u) => String(u._id) === String(unitId))?.slug
    if (unitSlug === 'sedetur') return 'sedetur'
    if (unitSlug === 'semads') return 'semads'
    if (unitSlug === 'saae') return 'saae'
    return 'semit'
  }, [items, units, unitId])

  return (
    <section className="card attendant-panel-pro">
      {/* Topo / Filtros Operacionais */}
      <div className="attendant-topbar">
        <div>
          <p className="eyebrow">Operação de Atendimento</p>
          <h2>Painel do Atendente</h2>
        </div>
        <div className="attendant-top-actions">
          {/* Seletor de Posto do Atendente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: '#f8fafc', padding: '.35rem .75rem', borderRadius: '.6rem', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)' }}>Meu Posto:</span>
            <select
              value={localType}
              onChange={(e) => setLocalType(e.target.value)}
              style={{ padding: '.25rem .45rem', fontSize: '.85rem' }}
            >
              <option value="Guichê">Guichê</option>
              <option value="Mesa">Mesa</option>
              <option value="Sala">Sala</option>
              <option value="Consultório">Consultório</option>
              <option value="Balcão">Balcão</option>
            </select>
            <input
              type="number"
              min="1"
              max="99"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              style={{ width: '3.6rem', padding: '.25rem .45rem', fontSize: '.85rem' }}
              title="Número do Guichê/Mesa"
            />
          </div>

          <button type="button" className="call-next-btn" onClick={callNext} disabled={busy || actionBusy || !metrics.pending}>
            📢 Chamar Próximo na TV
          </button>
          <button type="button" className="dark" disabled={busy} onClick={refresh}>
            🔄 {busy ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {callNotice && (
        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '.75rem 1.2rem', borderRadius: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.5rem', animation: 'fadeIn .3s ease' }}>
          {callNotice}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="attendant-filter-bar">
        {units.length > 0 && (
          <label>Unidade
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Todas as unidades</option>
              {units.map((unit) => <option key={unit._id} value={unit._id}>{unit.name}</option>)}
            </select>
          </label>
        )}
        <label>Serviço
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} disabled={!prefsReady}>
            <option value="">Todos os serviços</option>
            {userServices.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </label>
        <label>Atendente
          <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} disabled={!prefsReady}>
            <option value="">Toda a equipe</option>
            {resources.filter((r) => r.active && r.type === 'attendant' && (!unitId || String(r.unitId?._id || r.unitId) === String(unitId))).map((res) => (
              <option key={res._id} value={res._id}>{res.name}</option>
            ))}
          </select>
        </label>
        <label className="search-label">Buscar Cidadão
          <input
            type="search"
            placeholder="🔍 Nome, CPF ou Protocolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Barra de Métricas do Dia */}
      <div className="metrics-strip">
        <div className="metric-pill total">
          <span className="metric-num">{metrics.total}</span>
          <span className="metric-lbl">Total no dia</span>
        </div>
        <div className="metric-pill booked">
          <span className="metric-num">{metrics.booked}</span>
          <span className="metric-lbl">Aguardando</span>
        </div>
        <div className="metric-pill confirmed">
          <span className="metric-num">{metrics.confirmed}</span>
          <span className="metric-lbl">Em Atendimento</span>
        </div>
        <div className="metric-pill completed">
          <span className="metric-num">{metrics.completed}</span>
          <span className="metric-lbl">Atendidos</span>
        </div>
        <div className="metric-pill noshow">
          <span className="metric-num">{metrics.noShow}</span>
          <span className="metric-lbl">Ausentes</span>
        </div>
        <div className="metric-pill cancelled">
          <span className="metric-num">{metrics.cancelled}</span>
          <span className="metric-lbl">Cancelados</span>
        </div>
      </div>

      {error && <p role="alert" className="error" style={{ margin: '1rem 0' }}>{error}</p>}

      {/* Grid Principal: Calendário Grande + Timeline de Atendimentos */}
      <div className="attendant-workspace">
        {/* Calendário Mensal Expandido */}
        <div className="attendant-calendar-box">
          <div className="cal-head-pro">
            <div className="cal-nav-group">
              <button type="button" className="cal-nav-btn" onClick={() => setCursor((item) => item.month === 0 ? { year: item.year - 1, month: 11 } : { year: item.year, month: item.month - 1 })} aria-label="Mês anterior">‹</button>
              <h3 className="cal-month-title">{title}</h3>
              <button type="button" className="cal-nav-btn" onClick={() => setCursor((item) => item.month === 11 ? { year: item.year + 1, month: 0 } : { year: item.year, month: item.month + 1 })} aria-label="Próximo mês">›</button>
            </div>
            <button type="button" className="ghost small-btn today-btn" onClick={goToToday}>Hoje</button>
          </div>

          <div className="cal-week-pro">
            {weekLabels.map((label) => <span key={label}>{label}</span>)}
          </div>

          <div className="cal-grid-pro">
            {cells.map((day, index) => {
              if (!day) return <div key={`e-${index}`} className="cal-cell-empty" />
              const key = dateKey(cursor.year, cursor.month, day)
              const stats = days[key]
              const pending = stats?.pending || 0
              const isToday = key === todayKey()
              const isSelected = key === date

              return (
                <button
                  key={key}
                  type="button"
                  className={`cal-cell-pro${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${pending > 0 ? ' has-queue' : ''}`}
                  onClick={() => setDate(key)}
                >
                  <span className="cell-day-num">{day}</span>
                  {pending > 0 ? (
                    <span className="cell-badge pending-badge">{pending} na fila</span>
                  ) : (
                    stats ? <span className="cell-badge done-badge">Sem fila</span> : null
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Painel do Dia / Fila de Atendimentos */}
        <div className="attendant-queue-box">
          <div className="queue-header">
            <div>
              <h3>{dayLabel}</h3>
              <p className="muted">
                {filteredItems.length} agendamento(s) exibido(s) {search ? `(filtrado por "${search}")` : ''}
              </p>
            </div>
            <label className="toggle-row compact-toggle">
              <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
              Mostrar finalizados
            </label>
          </div>

          {busy && <p className="muted" style={{ padding: '1rem' }}>Carregando atendimentos do dia…</p>}
          {!busy && !filteredItems.length && (
            <div className="empty-queue-box">
              <p className="empty-icon">☕</p>
              <h4>Nenhum atendimento para o filtro selecionado</h4>
              {items.length > 0 && resourceId ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <p className="muted" style={{ marginBottom: '0.75rem' }}>
                    Há <b>{items.length}</b> agendamento(s) nesta data para outros atendentes ou serviços.
                  </p>
                  <button
                    type="button"
                    className="dark small-btn"
                    style={{ padding: '0.55rem 1.1rem', borderRadius: '0.5rem', fontWeight: 600 }}
                    onClick={() => setResourceId('')}
                  >
                    👥 Exibir Toda a Equipe ({items.length} agendamentos)
                  </button>
                </div>
              ) : (
                <p className="muted">Não há agendamentos para os filtros selecionados nesta data.</p>
              )}
            </div>
          )}

          <div className="appointment-card-list">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item._id
              const citizenName = item.identitySnapshot?.name || item.userId?.name || 'Cidadão'
              const citizenPhone = item.identitySnapshot?.phone || item.userId?.phone || ''
              const citizenCpf = item.identitySnapshot?.cpf || item.userId?.cpf || ''
              const citizenEmail = item.identitySnapshot?.email || item.userId?.email || ''
              const st = statusMap[item.status] || { label: item.status, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' }
              const phoneDigits = cleanPhone(citizenPhone)

              return (
                <div
                  id={`appointment-${item._id}`}
                  key={item._id}
                  className={`app-card-item${isExpanded ? ' is-expanded' : ''} status-${item.status}`}
                  style={{ borderLeftColor: st.color }}
                >
                  {/* Cabeçalho do Card (Clicável para expandir) */}
                  <div className="app-card-header" onClick={() => setExpandedId(isExpanded ? null : item._id)}>
                    <div className="app-card-time">
                      <strong>{clock(item.startsAt)}</strong>
                      <small>{clock(item.endsAt)}</small>
                    </div>

                    <div className="app-card-main-info">
                      <div className="citizen-name-row">
                        <span className="citizen-avatar">{(citizenName || '?').slice(0, 1).toUpperCase()}</span>
                        <strong>{citizenName}</strong>
                      </div>
                      <p className="service-sub">
                        {item.serviceId?.name} {item.resourceId?.name ? `· Atendente: ${item.resourceId.name}` : ''}
                      </p>
                    </div>

                    <div className="app-card-right">
                      <select
                        className="status-select"
                        value={item.status}
                        disabled={actionBusy}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation()
                          const next = e.target.value
                          if (next !== item.status) transition(item._id, next)
                        }}
                        style={{ color: st.color, backgroundColor: st.bg, borderColor: st.border }}
                        aria-label={`Status de ${citizenName}`}
                      >
                        {allowedStatusOptions(item.status).map((statusKey) => (
                          <option key={statusKey} value={statusKey}>{statusMap[statusKey]?.label || statusKey}</option>
                        ))}
                      </select>
                      <span className="expand-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Detalhes Expandidos (Click-to-Expand) */}
                  {isExpanded && (
                    <div className="app-card-body">
                      <div className="details-grid">
                        <div className="detail-item">
                          <small>Protocolo</small>
                          <span><b>{item.protocol}</b></span>
                        </div>
                        {citizenCpf && (
                          <div className="detail-item">
                            <small>CPF / Documento</small>
                            <span>{citizenCpf}</span>
                          </div>
                        )}
                        <div className="detail-item">
                          <small>Telefone / WhatsApp</small>
                          <div className="phone-row">
                            <span>{citizenPhone || 'Não informado'}</span>
                            {phoneDigits.length >= 10 && (
                              <a
                                href={`https://wa.me/55${phoneDigits}?text=${encodeURIComponent(`Olá ${citizenName}, confirmamos seu agendamento na Prefeitura de Garça para ${item.serviceId?.name} às ${clock(item.startsAt)}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="whatsapp-btn"
                              >
                                💬 WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                        {citizenEmail && (
                          <div className="detail-item">
                            <small>E-mail</small>
                            <span>{citizenEmail}</span>
                          </div>
                        )}
                        {item.notes && (
                          <div className="detail-item full-width">
                            <small>Observações do Cidadão</small>
                            <p className="citizen-notes">{item.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Barra de Ações Operacionais */}
                      <div className="card-actions-bar">
                        {['booked', 'confirmed'].includes(item.status) && (
                          <button
                            type="button"
                            className="action-btn"
                            style={{ background: '#0284c7', color: '#fff', fontWeight: 700 }}
                            disabled={actionBusy}
                            onClick={() => callInPanel(item)}
                          >
                            📢 {item.status === 'confirmed' ? 'Chamar Novamente na TV' : 'Chamar na TV'}
                          </button>
                        )}

                        {item.status === 'booked' && (
                          <button
                            type="button"
                            className="action-btn start-btn"
                            disabled={actionBusy}
                            onClick={() => transition(item._id, 'confirmed')}
                          >
                            🚀 Iniciar Atendimento
                          </button>
                        )}

                        {item.status === 'confirmed' && (
                          <>
                            <button
                              type="button"
                              className="action-btn complete-btn"
                              disabled={actionBusy}
                              onClick={() => transition(item._id, 'completed')}
                            >
                              ✅ Concluir (Atendido)
                            </button>
                            <button
                              type="button"
                              className="action-btn noshow-btn"
                              disabled={actionBusy}
                              onClick={() => transition(item._id, 'no_show')}
                            >
                              ⚠️ Marcar Ausente
                            </button>
                          </>
                        )}

                        {['booked', 'confirmed'].includes(item.status) && (
                          <button
                            type="button"
                            className="action-btn cancel-btn"
                            disabled={actionBusy}
                            onClick={() => transition(item._id, 'cancelled')}
                          >
                            ❌ Cancelar
                          </button>
                        )}

                        {['completed', 'no_show', 'cancelled'].includes(item.status) && (
                          <button
                            type="button"
                            className="ghost small-btn"
                            disabled={actionBusy}
                            onClick={() => transition(item._id, 'confirmed')}
                          >
                            Reabrir atendimento
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
