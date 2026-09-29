import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, CENTRAL_LOGIN_PATH, clearToken, readToken, storeToken } from './api'
import AdminConfig from './AdminConfig.jsx'
import AttendantPanel from './AttendantPanel.jsx'
import BookingCalendar from './BookingCalendar.jsx'
import ServiceLanding from './ServiceLanding.jsx'
import Register from './Register.jsx'
import { parseLandingHash } from './adminConfig'

const statusLabel = { booked: 'Agendado', confirmed: 'Confirmado', cancelled: 'Cancelado', completed: 'Atendido', no_show: 'Ausente' }

function Login({ onLogin, onToggleRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api(CENTRAL_LOGIN_PATH, { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }) })
      storeToken(data.token)
      await onLogin()
    } catch (err) {
      clearToken()
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login">
      <div className="login-shell">
        <section className="login-brand">
          <img src="./logos/logo_agenda_fundoescuro.png" alt="Agenda Garça" className="brand-logo-hero" />
          <p className="eyebrow" style={{ marginTop: '1rem' }}>Prefeitura de Garça</p>
          <p>Marque atendimento com a mesma conta dos serviços municipais.</p>
        </section>
        <section className="login-form">
          <h2>Entrar</h2>
          <p className="muted">E-mail e senha da plataforma.</p>
          <form onSubmit={submit}>
            <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <p role="alert" className="error">{error}</p>}
            <button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
          <nav className="login-links" aria-label="Acesso à conta">
            <a href="/forgot-password">Esqueci minha senha</a>
            <button type="button" className="link-button" onClick={onToggleRegister}>Criar cadastro</button>
          </nav>
        </section>
      </div>
    </main>
  )
}

export default function App() {
  const [me, setMe] = useState(null)
  const [agenda, setAgenda] = useState(null)
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [rebooking, setRebooking] = useState(null)
  const [tab, setTab] = useState('agendar')
  const [authMode, setAuthMode] = useState('login')
  const [hash, setHash] = useState(typeof window !== 'undefined' ? window.location.hash : '')
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const landing = parseLandingHash(hash)
  const service = useMemo(() => services.find((item) => item._id === selected), [services, selected])
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [identity, catalog, mine] = await Promise.all([
        api('/api/agenda/me'),
        api('/api/agenda/services'),
        api('/api/agenda/appointments/mine'),
      ])
      setMe(identity.user)
      setAgenda(identity.agenda)
      setServices(catalog.items)
      setAppointments(mine.items)
      const manage = identity.agenda?.isGlobalAdmin || identity.agenda?.assignments?.some((item) => ['agenda_admin', 'agenda_manager'].includes(item.role))
      if (manage && !(catalog.items || []).length) setTab('catalogo')
    } catch {
      clearToken()
      setMe(null)
      setAgenda(null)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { if (readToken()) load(); else setLoading(false) }, [load])

  async function book(startsAt) {
    try {
      const headers = { 'Idempotency-Key': crypto.randomUUID() }
      let res
      if (rebooking) {
        res = await api(`/api/agenda/appointments/${rebooking._id}/reschedule`, { method: 'PATCH', headers, body: JSON.stringify({ serviceId: selected, startsAt }) })
      } else {
        res = await api('/api/agenda/appointments', { method: 'POST', headers, body: JSON.stringify({ serviceId: selected, startsAt, source: 'web' }) })
      }
      const apt = res.appointment || {}
      const formattedDate = new Date(startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      const protInfo = apt.protocol ? ` Protocolo: ${apt.protocol}.` : ''
      setMessage(`✅ Agendamento confirmado com sucesso para ${formattedDate}!${protInfo} O comprovante foi enviado ao seu e-mail.`)
      setRebooking(null)
      setTab('meus')
      await load()
    } catch (err) {
      setMessage(`❌ ${err.message}`)
      throw err
    }
  }
  function startRebooking(item) {
    setRebooking(item)
    setSelected(item.serviceId?._id || item.serviceId)
    setTab('agendar')
    setMessage('Escolha o novo horário. A reserva atual será preservada até a confirmação.')
  }
  async function cancel(id) {
    if (!confirm('Deseja cancelar este agendamento?')) return
    try {
      await api(`/api/agenda/appointments/${id}/cancel`, { method: 'PATCH', body: '{}' })
      setMessage('Agendamento cancelado.')
      await load()
    } catch (err) {
      setMessage(err.message)
    }
  }

  if (landing) {
    return (
      <ServiceLanding
        unitSlug={landing.unitSlug}
        serviceSlug={landing.serviceSlug}
        onExit={() => { window.location.hash = '' }}
      />
    )
  }
  if (loading) return <main className="center" aria-live="polite">Carregando Agenda Garça…</main>
  if (!me) {
    if (authMode === 'register') {
      return <Register onLogin={load} onToggleLogin={() => setAuthMode('login')} />
    }
    return <Login onLogin={load} onToggleRegister={() => setAuthMode('register')} />
  }

  const canOperate = agenda?.isGlobalAdmin || agenda?.assignments?.length > 0
  const canManage = agenda?.isGlobalAdmin || agenda?.assignments?.some((item) => ['agenda_admin', 'agenda_manager'].includes(item.role))

  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <header className="topbar">
        <div className="topbar-brand">
          <img src="./logos/logo_agenda_fundoescuro.png" alt="Agenda Garça" className="topbar-logo" />
        </div>
        <div className="userbox">
          {me.image ? (
            <img
              src={me.image.startsWith('http') || me.image.startsWith('/') ? me.image : `/images/users/${me.image}`}
              alt={me.name}
              className="avatar-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; const fallback = e.currentTarget.nextSibling; if (fallback) fallback.style.display = 'grid' }}
            />
          ) : null}
          <span className="avatar" style={{ display: me.image ? 'none' : 'grid' }} aria-hidden="true">
            {(me.name || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="user-name"><b>{me.name}</b></span>
          <button className="ghost" onClick={() => { clearToken(); setMe(null); setAgenda(null) }}>Sair</button>
        </div>
      </header>
      <nav className="app-nav" aria-label="Seções da Agenda">
        <button type="button" aria-current={tab === 'agendar' ? 'page' : undefined} onClick={() => setTab('agendar')}>Agendar</button>
        <button type="button" aria-current={tab === 'meus' ? 'page' : undefined} onClick={() => setTab('meus')}>Meus agendamentos</button>
        {canOperate && <button type="button" aria-current={tab === 'operacao' ? 'page' : undefined} onClick={() => setTab('operacao')}>Atendente</button>}
        {canManage && <button type="button" aria-current={tab === 'catalogo' ? 'page' : undefined} onClick={() => setTab('catalogo')}>Catálogo</button>}
      </nav>
      <main id="conteudo" className="layout">
        {message && <p role="status" aria-live="polite" className="notice">{message}</p>}
        {tab === 'agendar' && (
          <section className="card">
            <div className="section-title">
              <h2>{rebooking ? 'Reagendar atendimento' : 'Novo agendamento'}</h2>
              {rebooking && <button className="dark" onClick={() => { setRebooking(null); setMessage('') }}>Manter horário atual</button>}
            </div>
            {!services.length && (
              <p className="empty-hint">
                Ainda não há serviços para marcar.
                {canManage ? ' Abra a aba Catálogo e cadastre unidade e serviço.' : ' Aguarde o cadastro administrativo do catálogo.'}
              </p>
            )}
            <label>Serviço
              <select value={selected} disabled={Boolean(rebooking) || !services.length} onChange={(e) => setSelected(e.target.value)}>
                <option value="">{services.length ? 'Selecione o serviço' : 'Nenhum serviço cadastrado'}</option>
                {services.map((item) => <option key={item._id} value={item._id}>{item.name} — {item.unitId?.name}</option>)}
              </select>
            </label>
            {service && <p className="muted">Duração: {service.durationMinutes} minutos. Clique no dia e depois no horário.</p>}
            {service && <BookingCalendar key={service._id} service={service} onBook={book} />}
          </section>
        )}
        {tab === 'meus' && (
          <section className="card">
            <h2>Meus agendamentos</h2>
            {!appointments.length && <p>Nenhum agendamento encontrado.</p>}
            <div className="appointments">
              {appointments.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>{item.serviceId?.name}</strong>
                    <p>{new Date(item.startsAt).toLocaleString('pt-BR')} · {item.unitId?.name}</p>
                    <span className={`status ${item.status}`}>{statusLabel[item.status] || item.status}</span>
                  </div>
                  {['booked', 'confirmed'].includes(item.status) && (
                    <div className="actions">
                      <button onClick={() => startRebooking(item)}>Reagendar</button>
                      <button className="danger" onClick={() => cancel(item._id)}>Cancelar</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {tab === 'operacao' && canOperate && <AttendantPanel agenda={agenda} />}
        {tab === 'catalogo' && canManage && <AdminConfig />}
      </main>
    </div>
  )
}
