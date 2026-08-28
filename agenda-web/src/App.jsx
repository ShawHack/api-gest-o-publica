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
  return <main className="login"><section className="card"><p className="eyebrow">Prefeitura de Garça</p><h1>Agenda Garça</h1><p>Entre com a mesma conta dos demais serviços municipais.</p><form onSubmit={submit}><label>E-mail<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="error">{error}</p>}<button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button></form><a href="/register">Ainda não possuo cadastro</a></section></main>
}

export default function App() {
  const [me, setMe] = useState(null); const [services, setServices] = useState([]); const [appointments, setAppointments] = useState([]); const [selected, setSelected] = useState(''); const [date, setDate] = useState(''); const [slots, setSlots] = useState([]); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true)
  const service = useMemo(() => services.find(item => item._id === selected), [services, selected])
  const load = useCallback(async () => { setLoading(true); try { const [identity, catalog, mine] = await Promise.all([api('/api/agenda/me'), api('/api/agenda/services'), api('/api/agenda/appointments/mine')]); setMe(identity.user); setServices(catalog.items); setAppointments(mine.items) } catch { clearToken(); setMe(null) } finally { setLoading(false) } }, [])
  useEffect(() => { if (readToken()) load(); else setLoading(false) }, [load])
  async function findSlots() { setMessage(''); try { const data = await api(`/api/agenda/services/${selected}/availability?date=${date}`); setSlots(data.slots) } catch (err) { setMessage(err.message) } }
  async function book(startsAt) { try { await api('/api/agenda/appointments', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ serviceId: selected, startsAt, source: 'web' }) }); setMessage('Agendamento confirmado.'); await load() } catch (err) { setMessage(err.message) } }
  async function cancel(id) { if (!confirm('Deseja cancelar este agendamento?')) return; try { await api(`/api/agenda/appointments/${id}/cancel`, { method: 'PATCH', body: '{}' }); setMessage('Agendamento cancelado.'); await load() } catch (err) { setMessage(err.message) } }
  if (loading) return <main className="center" aria-live="polite">Carregando Agenda Garça…</main>
  if (!me) return <Login onLogin={load} />
  return <><header><div><p className="eyebrow">Prefeitura de Garça</p><h1>Agenda Garça</h1></div><div><span>{me.name}</span><button className="secondary" onClick={() => { clearToken(); setMe(null) }}>Sair</button></div></header><main className="layout">{message && <p role="status" className="notice">{message}</p>}<section className="card"><h2>Novo agendamento</h2><label>Serviço<select value={selected} onChange={e => { setSelected(e.target.value); setSlots([]) }}><option value="">Selecione</option>{services.map(item => <option key={item._id} value={item._id}>{item.name} — {item.unitId?.name}</option>)}</select></label><label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><button disabled={!selected || !date} onClick={findSlots}>Consultar horários</button>{service && <p className="muted">Duração: {service.durationMinutes} minutos</p>}<div className="slots">{slots.map(slot => <button key={slot.startsAt} disabled={!slot.available} onClick={() => book(slot.startsAt)} aria-label={`${slot.time}, ${slot.available ? 'disponível' : 'indisponível'}`}>{slot.time}<small>{slot.available ? `${slot.remainingCapacity} vaga(s)` : 'Indisponível'}</small></button>)}</div></section><section className="card"><h2>Meus agendamentos</h2>{!appointments.length && <p>Nenhum agendamento encontrado.</p>}<div className="appointments">{appointments.map(item => <article key={item._id}><div><strong>{item.serviceId?.name}</strong><p>{new Date(item.startsAt).toLocaleString('pt-BR')} · {item.unitId?.name}</p><span className={`status ${item.status}`}>{statusLabel[item.status] || item.status}</span></div>{['booked', 'confirmed'].includes(item.status) && <button className="danger" onClick={() => cancel(item._id)}>Cancelar</button>}</article>)}</div></section></main></>
}
