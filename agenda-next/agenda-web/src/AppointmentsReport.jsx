import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const statusMap = {
  booked: { label: 'Agendado', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  confirmed: { label: 'Confirmado', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  completed: { label: 'Atendido', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  no_show: { label: 'Ausente', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  cancelled: { label: 'Cancelado', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
}

function formatDate(isoStr) {
  if (!isoStr) return '-'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '-'
  }
}

function formatTime(isoStr) {
  if (!isoStr) return '-'
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

function getAttendantName(item) {
  if (item.statusUpdatedBy?.name) return item.statusUpdatedBy.name
  const historyCalls = (item.statusHistory || []).filter((h) => h.by?.name)
  if (historyCalls.length > 0) return historyCalls[historyCalls.length - 1].by.name
  return '-'
}

export default function AppointmentsReport() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [datePreset, setDatePreset] = useState('today')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [unitId, setUnitId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  // Listas para dropdowns
  const [units, setUnits] = useState([])
  const [services, setServices] = useState([])

  // Inicializar datas com presets
  const applyPreset = useCallback((preset) => {
    setDatePreset(preset)
    const now = new Date()
    const fmt = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (preset === 'today') {
      const todayStr = fmt(now)
      setDateFrom(`${todayStr}T00:00:00.000-03:00`)
      setDateTo(`${todayStr}T23:59:59.999-03:00`)
    } else if (preset === 'yesterday') {
      const yest = new Date(now)
      yest.setDate(yest.getDate() - 1)
      const yestStr = fmt(yest)
      setDateFrom(`${yestStr}T00:00:00.000-03:00`)
      setDateTo(`${yestStr}T23:59:59.999-03:00`)
    } else if (preset === 'last7') {
      const past = new Date(now)
      past.setDate(past.getDate() - 7)
      setDateFrom(`${fmt(past)}T00:00:00.000-03:00`)
      setDateTo(`${fmt(now)}T23:59:59.999-03:00`)
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setDateFrom(`${fmt(firstDay)}T00:00:00.000-03:00`)
      setDateTo(`${fmt(lastDay)}T23:59:59.999-03:00`)
    } else if (preset === 'all') {
      setDateFrom('')
      setDateTo('')
    }
    setPage(1)
  }, [])

  // Carregar unidades e serviços
  useEffect(() => {
    applyPreset('today')
    Promise.all([
      api('/api/agenda/admin/units').catch(() => ({ items: [] })),
      api('/api/agenda/services').catch(() => ({ items: [] })),
    ]).then(([uData, sData]) => {
      setUnits(uData.items || [])
      setServices(sData.items || [])
    })
  }, [applyPreset])

  // Filtrar serviços pela unidade selecionada
  const filteredServices = useMemo(() => {
    if (!unitId) return services
    return services.filter((s) => (s.unitId?._id || s.unitId) === unitId)
  }, [services, unitId])

  // Carregar dados de atendimentos
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sort', 'desc')
      if (unitId) params.set('unitId', unitId)
      if (serviceId) params.set('serviceId', serviceId)
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await api(`/api/agenda/admin/appointments?${params.toString()}`)
      setItems(res.items || [])
      setTotal(res.pagination?.total || 0)
    } catch (err) {
      setError(err.message || 'Falha ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }, [page, limit, unitId, serviceId, status, search, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Métricas
  const metrics = useMemo(() => {
    let completed = 0
    let pending = 0
    let noShow = 0
    let cancelled = 0

    for (const it of items) {
      if (it.status === 'completed') completed++
      else if (it.status === 'booked' || it.status === 'confirmed') pending++
      else if (it.status === 'no_show') noShow++
      else if (it.status === 'cancelled') cancelled++
    }

    return {
      total: items.length,
      completed,
      pending,
      noShow,
      cancelled,
      rate: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
    }
  }, [items])

  // Exportar CSV
  function exportCSV() {
    if (!items.length) return
    const headers = ['Data', 'Horário', 'Protocolo', 'Senha', 'Cidadão', 'Email', 'Telefone', 'Unidade', 'Serviço', 'Atendente', 'Status']
    const rows = items.map((it) => [
      formatDate(it.startsAt),
      formatTime(it.startsAt),
      it.protocol || '',
      it.panelTicket || '',
      `"${(it.identitySnapshot?.name || it.userId?.name || '').replace(/"/g, '""')}"`,
      it.identitySnapshot?.email || it.userId?.email || '',
      it.identitySnapshot?.phone || it.userId?.phone || '',
      `"${(it.unitId?.name || '').replace(/"/g, '""')}"`,
      `"${(it.serviceId?.name || '').replace(/"/g, '""')}"`,
      `"${getAttendantName(it).replace(/"/g, '""')}"`,
      statusMap[it.status]?.label || it.status,
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_atendimentos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Imprimir Relatório
  function printReport() {
    window.print()
  }

  return (
    <section className="report-panel" style={{ padding: '1.25rem 0', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Cabeçalho do Relatório */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>📊 Relatório de Atendimentos</h2>
          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Consulte o histórico detalhado, filtre por atendente, unidade, serviço e período.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || !items.length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.6rem', fontWeight: 600, cursor: 'pointer' }}
          >
            📥 Exportar CSV
          </button>
          <button
            type="button"
            onClick={printReport}
            disabled={loading || !items.length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.6rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🖨️ Imprimir
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.6rem', fontWeight: 600, cursor: 'pointer' }}
          >
            🔄 {loading ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Listado</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{total}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #a7f3d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Atendidos</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#065f46', marginTop: '0.25rem' }}>{metrics.completed}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Pendentes</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>{metrics.pending}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Ausentes (No-show)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#991b1b', marginTop: '0.25rem' }}>{metrics.noShow}</div>
        </div>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Cancelados</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#475569', marginTop: '0.25rem' }}>{metrics.cancelled}</div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Presets de Data */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Período:</span>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: 'last7', label: 'Últimos 7 dias' },
            { id: 'thisMonth', label: 'Este Mês' },
            { id: 'all', label: 'Todos' },
            { id: 'custom', label: 'Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              style={{
                background: datePreset === p.id ? 'var(--color-primary, #0b5fff)' : '#f8fafc',
                color: datePreset === p.id ? '#ffffff' : '#475569',
                border: `1px solid ${datePreset === p.id ? 'var(--color-primary, #0b5fff)' : '#cbd5e1'}`,
                padding: '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Campos de Filtro */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          {datePreset === 'custom' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Data Inicial</label>
                <input
                  type="date"
                  value={dateFrom ? dateFrom.slice(0, 10) : ''}
                  onChange={(e) => {
                    setDateFrom(e.target.value ? `${e.target.value}T00:00:00.000-03:00` : '')
                    setPage(1)
                  }}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Data Final</label>
                <input
                  type="date"
                  value={dateTo ? dateTo.slice(0, 10) : ''}
                  onChange={(e) => {
                    setDateTo(e.target.value ? `${e.target.value}T23:59:59.999-03:00` : '')
                    setPage(1)
                  }}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Unidade</label>
            <select
              value={unitId}
              onChange={(e) => { setUnitId(e.target.value); setServiceId(''); setPage(1) }}
              style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todas as Unidades</option>
              {units.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Serviço</label>
            <select
              value={serviceId}
              onChange={(e) => { setServiceId(e.target.value); setPage(1) }}
              style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Serviços</option>
              {filteredServices.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Todos os Status</option>
              <option value="booked">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Atendido (Concluído)</option>
              <option value="no_show">Ausente</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Busca Rápida</label>
            <input
              type="text"
              placeholder="Nome, Protocolo, Senha, CPF..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              style={{ width: '100%', padding: '0.45rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Tabela de Resultados */}
      <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Data/Hora</th>
                <th style={{ padding: '0.75rem 1rem' }}>Senha</th>
                <th style={{ padding: '0.75rem 1rem' }}>Protocolo</th>
                <th style={{ padding: '0.75rem 1rem' }}>Cidadão</th>
                <th style={{ padding: '0.75rem 1rem' }}>Serviço</th>
                <th style={{ padding: '0.75rem 1rem' }}>Unidade</th>
                <th style={{ padding: '0.75rem 1rem' }}>Atendente</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Carregando atendimentos…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Nenhum agendamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const st = statusMap[it.status] || { label: it.status, bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' }
                  const name = it.identitySnapshot?.name || it.userId?.name || 'Cidadão'
                  const phone = it.identitySnapshot?.phone || it.userId?.phone || ''
                  const attendant = getAttendantName(it)

                  return (
                    <tr key={it._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{formatDate(it.startsAt)}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{formatTime(it.startsAt)} - {formatTime(it.endsAt)}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0' }}>
                          {it.panelTicket || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#475569', fontSize: '0.8rem' }}>
                        {it.protocol || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{name}</div>
                        {phone && <div style={{ color: '#64748b', fontSize: '0.75rem' }}>📞 {phone}</div>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: 600 }}>
                        {it.serviceId?.name || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {it.unitId?.name || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                        {attendant}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                        }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
          <div style={{ color: '#64748b' }}>
            Total de registros: <b>{total}</b> (página {page} de {Math.max(1, Math.ceil(total / limit))})
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page * limit >= total || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '0.3rem 0.7rem', borderRadius: '0.4rem', border: '1px solid #cbd5e1', background: '#fff', cursor: page * limit >= total ? 'not-allowed' : 'pointer' }}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
