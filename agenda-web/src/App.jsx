import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, clearToken, readToken, storeToken } from './api'

const statusLabel = { booked: 'Agendado', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Atendido', no_show: 'Ausente' }

function Login({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const data = await api('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }); storeToken(data.token); await onLogin() }
    catch (err) { clearToken(); setError(err.message) } finally { setBusy(false) }
  }
  return <main className="login"><section className="card"><p className="eyebrow">Prefeitura de Garça</p><h1>Agenda Garça</h1><p>Entre com a mesma conta dos demais serviços municipais.</p><form onSubmit={submit}><label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="error">{error}</p>}<button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button></form><nav className="login-links" aria-label="Acesso à conta"><a href="/forgot-password">Esqueci minha senha</a><a href="/register">Ainda não possuo cadastro</a></nav></section></main>
}

function AdminPanel({ agenda }) {
  const [items, setItems] = useState([]); const [summary, setSummary] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const canManage = agenda.isGlobalAdmin || agenda.assignments?.some(item => ['agenda_admin', 'agenda_manager'].includes(item.role))
  const refresh = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const calendar = await api('/api/agenda/admin/appointments?status=booked,confirmed&page=1&limit=50')
      setItems(calendar.items)
      if (canManage) setSummary(await api('/api/agenda/admin/reports/summary'))
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }, [canManage])
  useEffect(() => { refresh() }, [refresh])
  async function transition(id, status) {
    const labels = { confirmed: 'confirmar', completed: 'concluir', no_show: 'registrar ausência', cancelled: 'cancelar' }
    if (!confirm(`Deseja ${labels[status]} este atendimento?`)) return
    try { await api(`/api/agenda/admin/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); await refresh() } catch (err) { setError(err.message) }
  }
  return <section className="card admin-panel"><div className="section-title"><div><p className="eyebrow">Área restrita</p><h2>Operação da Agenda</h2></div><button className="dark" disabled={busy} onClick={refresh}>Atualizar</button></div>{error && <p role="alert" className="error">{error}</p>}{summary && <div className="metrics"><div><strong>{summary.total}</strong><span>Total</span></div>{Object.entries(summary.byStatus || {}).map(([status, total]) => <div key={status}><strong>{total}</strong><span>{statusLabel[status] || status}</span></div>)}</div>}<div className="operation-list">{!items.length && !busy && <p>Nenhum atendimento pendente.</p>}{items.map(item => <article key={item._id}><div><strong>{item.identitySnapshot?.name || item.userId?.name}</strong><p>{item.serviceId?.name} · {item.unitId?.name}</p><p>{new Date(item.startsAt).toLocaleString('pt-BR')} · {statusLabel[item.status]}</p></div><div className="actions">{item.status === 'booked' && <button onClick={() => transition(item._id, 'confirmed')}>Confirmar</button>}{item.status === 'confirmed' && <><button onClick={() => transition(item._id, 'completed')}>Concluir</button><button className="dark" onClick={() => transition(item._id, 'no_show')}>Ausente</button></>}<button className="danger" onClick={() => transition(item._id, 'cancelled')}>Cancelar</button></div></article>)}</div></section>
}

export default function App() {
  const [me, setMe] = useState(null); const [agenda, setAgenda] = useState(null); const [services, setServices] = useState([]); const [appointments, setAppointments] = useState([]); const [selected, setSelected] = useState(''); const [date, setDate] = useState(''); const [slots, setSlots] = useState([]); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [rebooking, setRebooking] = useState(null)
  const service = useMemo(() => services.find(item => item._id === selected), [services, selected])
  const today = new Date().toISOString().slice(0, 10)
  const load = useCallback(async () => { setLoading(true); try { const [identity, catalog, mine] = await Promise.all([api('/api/agenda/me'), api('/api/agenda/services'), api('/api/agenda/appointments/mine')]); setMe(identity.user); setAgenda(identity.agenda); setServices(catalog.items); setAppointments(mine.items) } catch { clearToken(); setMe(null); setAgenda(null) } finally { setLoading(false) } }, [])
  useEffect(() => { if (readToken()) load(); else setLoading(false) }, [load])
  async function findSlots() { setMessage(''); try { const data = await api(`/api/agenda/services/${selected}/availability?date=${date}`); setSlots(data.slots) } catch (err) { setMessage(err.message) } }
  async function book(startsAt) { try { const headers = { 'Idempotency-Key': crypto.randomUUID() }; if (rebooking) await api(`/api/agenda/appointments/${rebooking._id}/reschedule`, { method: 'PATCH', headers, body: JSON.stringify({ serviceId: selected, startsAt }) }); else await api('/api/agenda/appointments', { method: 'POST', headers, body: JSON.stringify({ serviceId: selected, startsAt, source: 'web' }) }); setMessage(rebooking ? 'Agendamento alterado com segurança.' : 'Agendamento confirmado.'); setRebooking(null); setSlots([]); await load() } catch (err) { setMessage(err.message) } }
  function startRebooking(item) { setRebooking(item); setSelected(item.serviceId?._id || item.serviceId); setDate(''); setSlots([]); setMessage('Escolha o novo horário. A reserva atual será preservada até a confirmação.'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function cancel(id) { if (!confirm('Deseja cancelar este agendamento?')) return; try { await api(`/api/agenda/appointments/${id}/cancel`, { method: 'PATCH', body: '{}' }); setMessage('Agendamento cancelado.'); await load() } catch (err) { setMessage(err.message) } }
  if (loading) return <main className="center" aria-live="polite">Carregando Agenda Garça…</main>
  if (!me) return <Login onLogin={load} />
  const canOperate = agenda?.isGlobalAdmin || agenda?.assignments?.length > 0
  return <><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><header><div><p className="eyebrow">Prefeitura de Garça</p><h1>Agenda Garça</h1></div><div><span>{me.name}</span><button className="secondary" onClick={() => { clearToken(); setMe(null); setAgenda(null) }}>Sair</button></div></header><main id="conteudo" className="layout">{message && <p role="status" aria-live="polite" className="notice">{message}</p>}<section className="card"><div className="section-title"><h2>{rebooking ? 'Reagendar atendimento' : 'Novo agendamento'}</h2>{rebooking && <button className="dark" onClick={() => { setRebooking(null); setSlots([]); setMessage('') }}>Manter horário atual</button>}</div><label>Serviço<select value={selected} disabled={Boolean(rebooking)} onChange={e => { setSelected(e.target.value); setSlots([]) }}><option value="">Selecione</option>{services.map(item => <option key={item._id} value={item._id}>{item.name} — {item.unitId?.name}</option>)}</select></label><label>Data<input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} /></label><button disabled={!selected || !date} onClick={findSlots}>Consultar horários</button>{service && <p className="muted">Duração: {service.durationMinutes} minutos</p>}<div className="slots">{slots.map(slot => <button key={slot.startsAt} disabled={!slot.available} onClick={() => book(slot.startsAt)} aria-label={`${slot.time}, ${slot.available ? 'disponível' : 'indisponível'}`}>{slot.time}<small>{slot.available ? `${slot.remainingCapacity} vaga(s)` : 'Indisponível'}</small></button>)}</div></section><section className="card"><h2>Meus agendamentos</h2>{!appointments.length && <p>Nenhum agendamento encontrado.</p>}<div className="appointments">{appointments.map(item => <article key={item._id}><div><strong>{item.serviceId?.name}</strong><p>{new Date(item.startsAt).toLocaleString('pt-BR')} · {item.unitId?.name}</p><span className={`status ${item.status}`}>{statusLabel[item.status] || item.status}</span></div>{['booked', 'confirmed'].includes(item.status) && <div className="actions"><button onClick={() => startRebooking(item)}>Reagendar</button><button className="danger" onClick={() => cancel(item._id)}>Cancelar</button></div>}</article>)}</div></section>{canOperate && <AdminPanel agenda={agenda} />}</main></>
}
