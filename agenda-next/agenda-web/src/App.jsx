import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, CENTRAL_LOGIN_PATH, clearToken, readToken, storeToken } from './api'
import AdminConfig from './AdminConfig.jsx'
import AttendantPanel from './AttendantPanel.jsx'
import AppointmentsReport from './AppointmentsReport.jsx'
import BookingCalendar from './BookingCalendar.jsx'
import ServiceLanding from './ServiceLanding.jsx'
import BookingVoucher from './BookingVoucher.jsx'
import Register from './Register.jsx'
import TvDisplay from './TvDisplay.jsx'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(null)
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
      const operate = identity.agenda?.isGlobalAdmin || (identity.agenda?.assignments || []).length > 0
      const manage = identity.agenda?.isGlobalAdmin || identity.agenda?.assignments?.some((item) => ['agenda_admin', 'agenda_manager'].includes(item.role))
      if (operate) setTab('operacao')
      else if (manage && !(catalog.items || []).length) setTab('catalogo')
    } catch (err) {
      if (err?.status === 401) {
        clearToken()
        setMe(null)
        setAgenda(null)
      } else {
        setMessage('Instabilidade temporária na conexão. Clique em Atualizar para recarregar.')
      }
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { if (readToken()) load(); else setLoading(false) }, [load])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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
      const bookedService = services.find((item) => item._id === selected) || service
      setBookingComplete({
        startsAt,
        protocol: apt.protocol || 'AGD-CONFIRMADO',
        panelTicket: apt.panelTicket || '',
        serviceName: bookedService?.name || apt.serviceId?.name || 'Atendimento',
        unitName: bookedService?.unitId?.name || apt.unitId?.name || '',
        address: bookedService?.landingAddress || bookedService?.unitId?.address || '',
      })
      setMessage('')
      setRebooking(null)
      setTab('agendar')
      await load()
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  if (hash === '#/tv' || hash === '#/painel') {
    window.location.href = '/p/semit'
    return null
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

  function logout() {
    clearToken()
    setMe(null)
    setAgenda(null)
    setMenuOpen(false)
  }

  function selectTab(nextTab) {
    setTab(nextTab)
    setMenuOpen(false)
  }

  // Barra de navegação principal superior
  const navItems = canOperate
    ? [
        { id: 'operacao', label: 'Central de atendimento', show: true },
        { id: 'relatorios', label: 'Relatórios', show: true },
        { id: 'catalogo', label: 'Catálogo', show: canManage },
      ].filter((item) => item.show)
    : [
        { id: 'agendar', label: 'Agendar', show: true },
        { id: 'meus', label: 'Meus agendamentos', show: true },
      ]

  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <header className="topbar">
        <div className="topbar-brand">
          <img src="./logos/logo_agenda_fundoescuro.png" alt="Agenda Garça" className="topbar-logo" />
        </div>
        <div className="topbar-actions">
          <div
            className="userbox"
            onClick={() => setMenuOpen((open) => !open)}
            style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '0.6rem', transition: 'background 0.2s' }}
            title="Abrir menu de perfil e serviços pessoais"
          >
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
            <button
              type="button"
              className="profile-menu-btn"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu de perfil'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              <span className="mobile-menu-btn__bar" aria-hidden="true" />
              <span className="mobile-menu-btn__bar" aria-hidden="true" />
              <span className="mobile-menu-btn__bar" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <nav className="app-nav app-nav--desktop" aria-label="Seções da Agenda">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {menuOpen ? (
        <>
          <button type="button" className="mobile-nav-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
          <nav id="mobile-nav" className="mobile-nav-drawer" aria-label="Menu do usuário">
            <div className="mobile-nav-drawer__user" style={{ paddingBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
              <span className="avatar" aria-hidden="true">{(me.name || '?').slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</strong>
                <small style={{ color: '#64748b' }}>{me.email}</small>
                {canOperate && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8' }}>
                      {canManage ? 'Gestor / Administrador' : 'Atendente'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Serviços Pessoais do Usuário / Atendente */}
            <div style={{ marginTop: '0.5rem', marginBottom: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Serviços Pessoais
            </div>
            <button
              type="button"
              className="mobile-nav-drawer__link"
              aria-current={tab === 'agendar' ? 'page' : undefined}
              onClick={() => selectTab('agendar')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left' }}
            >
              <span>🗓️</span> Agendar atendimento
            </button>
            <button
              type="button"
              className="mobile-nav-drawer__link"
              aria-current={tab === 'meus' ? 'page' : undefined}
              onClick={() => selectTab('meus')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left' }}
            >
              <span>📋</span> Meus agendamentos
            </button>

            {/* Operação e Gestão (quando aplicável) */}
            {canOperate && (
              <>
                <div style={{ marginTop: '0.8rem', marginBottom: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Operação & Gestão
                </div>
                <button
                  type="button"
                  className="mobile-nav-drawer__link"
                  aria-current={tab === 'operacao' ? 'page' : undefined}
                  onClick={() => selectTab('operacao')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left' }}
                >
                  <span>🏢</span> Central de atendimento
                </button>
                <button
                  type="button"
                  className="mobile-nav-drawer__link"
                  aria-current={tab === 'relatorios' ? 'page' : undefined}
                  onClick={() => selectTab('relatorios')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left' }}
                >
                  <span>📊</span> Relatórios
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="mobile-nav-drawer__link"
                    aria-current={tab === 'catalogo' ? 'page' : undefined}
                    onClick={() => selectTab('catalogo')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'left' }}
                  >
                    <span>⚙️</span> Catálogo de Serviços
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              className="mobile-nav-drawer__logout"
              onClick={logout}
              style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <span>🚪</span> Sair da conta
            </button>
          </nav>
        </>
      ) : null}
      <main id="conteudo" className="layout">
        {message && !bookingComplete && <p role="status" aria-live="polite" className="notice">{message}</p>}
        {bookingComplete ? (
          <BookingVoucher
            {...bookingComplete}
            onContinue={() => { setBookingComplete(null); setTab('meus') }}
            onNewBooking={() => { setBookingComplete(null); setSelected('') }}
          />
        ) : tab === 'agendar' && (
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
        {!bookingComplete && tab === 'meus' && (
          <section className="card">
            <h2>Meus agendamentos</h2>
            {!appointments.length && <p>Nenhum agendamento encontrado.</p>}
            <div className="appointments">
              {appointments.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>{item.serviceId?.name}</strong>
                    <p>{new Date(item.startsAt).toLocaleString('pt-BR')} · {item.unitId?.name}</p>
                    {item.panelTicket ? (
                      <p className="appointment-ticket">Senha no painel: <strong>{item.panelTicket}</strong></p>
                    ) : null}
                    {item.protocol ? (
                      <p className="appointment-protocol">Protocolo: <code>{item.protocol}</code></p>
                    ) : null}
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
        {!bookingComplete && tab === 'operacao' && canOperate && <AttendantPanel agenda={agenda} me={me} />}
        {!bookingComplete && tab === 'relatorios' && (canOperate || canManage) && <AppointmentsReport />}
        {!bookingComplete && tab === 'catalogo' && canManage && <AdminConfig />}
      </main>
    </div>
  )
}
