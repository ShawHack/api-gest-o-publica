import { useCallback, useEffect, useState } from 'react'
import { api, CENTRAL_LOGIN_PATH, readToken, storeToken } from './api'
import BookingCalendar from './BookingCalendar.jsx'
import LandingEditor from './LandingEditor.jsx'

function formatCpf(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  if (digits.length > 10) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (digits.length > 6) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  }
  if (digits.length > 2) {
    return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  }
  return digits
}

export default function ServiceLanding({ unitSlug, serviceSlug, onExit }) {
  const [pack, setPack] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Auth states
  const [authTab, setAuthTab] = useState('register') // 'login' ou 'register'
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register states
  const [regName, setRegName] = useState('')
  const [regCpf, setRegCpf] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regTerms, setRegTerms] = useState(true)

  const [pendingSlot, setPendingSlot] = useState(null)
  const [bookingComplete, setBookingComplete] = useState(null)
  const [logged, setLogged] = useState(Boolean(readToken()))
  const [currentUser, setCurrentUser] = useState(null)
  const [canConfigure, setCanConfigure] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/agenda/public/${unitSlug}/${serviceSlug}`)
      setPack(data)
    } catch (err) {
      setError(err.message)
    }
  }, [unitSlug, serviceSlug])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!readToken()) {
      setLogged(false)
      setCurrentUser(null)
      setCanConfigure(false)
      return
    }
    api('/api/agenda/me').then((identity) => {
      setLogged(true)
      setCurrentUser(identity.user || null)
      const agenda = identity.agenda || {}
      setCanConfigure(!!agenda.isGlobalAdmin || (agenda.assignments || []).some((item) => ['agenda_admin', 'agenda_manager'].includes(item.role)))
    }).catch(() => {
      setLogged(false)
      setCurrentUser(null)
      setCanConfigure(false)
    })
  }, [logged])

  async function performBooking(startsAt) {
    try {
      setBusy(true)
      const data = await api('/api/agenda/appointments', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ serviceId: pack.service._id, startsAt, source: 'web' }),
      })
      const apt = data.appointment || {}
      setBookingComplete({
        startsAt,
        protocol: apt.protocol || 'AGD-CONFIRMADO',
        panelTicket: apt.panelTicket || '',
        name: currentUser?.name || regName || '',
        email: currentUser?.email || regEmail || loginEmail || '',
      })
      setPendingSlot(null)
      setSuccessMsg(`✅ Agendamento confirmado com sucesso para ${new Date(startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}! Um comprovante foi enviado ao seu e-mail.`)
      setNotice('')
      window.scrollTo({ top: 150, behavior: 'smooth' })
    } catch (err) {
      setNotice(err.message)
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function book(startsAt) {
    setSuccessMsg('')
    setNotice('')
    setPendingSlot(startsAt)
    if (!readToken()) {
      setNotice('Selecione uma das opções abaixo (Entrar ou Cadastrar-se) para concluir seu agendamento.')
      setTimeout(() => {
        document.getElementById('landing-auth-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return
    }
    await performBooking(startsAt)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setNotice('')
    setSuccessMsg('')
    setBusy(true)
    try {
      const data = await api(CENTRAL_LOGIN_PATH, {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword }),
      })
      storeToken(data.token)
      setLogged(true)
      if (pendingSlot) {
        await performBooking(pendingSlot)
      } else {
        setNotice('Login realizado com sucesso! Agora clique no horário desejado no calendário acima.')
      }
    } catch (err) {
      setNotice(err.message || 'Falha ao realizar login. Verifique seu e-mail e senha.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    setNotice('')
    setSuccessMsg('')

    const cleanCpf = regCpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      setNotice('Informe um CPF válido com 11 dígitos.')
      return
    }

    const cleanPhone = regPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setNotice('Informe um WhatsApp/celular com DDD válido.')
      return
    }

    if (regPassword !== regConfirmPassword) {
      setNotice('As senhas digitadas não conferem.')
      return
    }

    if (regPassword.length < 6) {
      setNotice('A senha deve conter no mínimo 6 caracteres.')
      return
    }

    if (!regTerms) {
      setNotice('É necessário concordar com os Termos de Uso.')
      return
    }

    setBusy(true)
    try {
      // 1. Cria conta central
      await api('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName.trim(),
          cpf: cleanCpf,
          phone: cleanPhone,
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          confirmpassword: regConfirmPassword,
          acceptedTermsAt: new Date().toISOString(),
          acceptedTermsVersion: '1.0',
          userType: 'Pessoa Física',
        }),
      })

      // 2. Faz login automático
      const loginData = await api(CENTRAL_LOGIN_PATH, {
        method: 'POST',
        body: JSON.stringify({ email: regEmail.trim().toLowerCase(), password: regPassword }),
      })
      storeToken(loginData.token)
      setLogged(true)

      // 3. Conclui agendamento imediatamente se houver slot selecionado
      if (pendingSlot) {
        await performBooking(pendingSlot)
      } else {
        setSuccessMsg('Cadastro criado com sucesso! Agora escolha o horário no calendário acima para concluir o agendamento.')
      }
    } catch (err) {
      setNotice(err.message || 'Não foi possível concluir o cadastro. Verifique os dados.')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <main className="landing">
        <section className="landing-hero"><h1>Agenda indisponível</h1><p>{error}</p></section>
      </main>
    )
  }
  if (!pack) return <main className="center">Carregando página de agendamento…</main>

  const { unit, service } = pack
  const address = pack.address || service.landingAddress || unit.address
  const period = [service.bookingFrom, service.bookingUntil].filter(Boolean)
  const availabilityPath = (date) => `/api/agenda/public/${unit.slug}/${service.slug}/availability?date=${date}`

  return (
    <main className="landing-page">
      {/* Barra superior institucional fixa e limpa */}
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="topbar-brand">
            <img src="./logos/logo_agenda_fundoescuro.png" alt="Agenda Garça" className="topbar-logo" />
          </div>
          <div className="form-actions" style={{ margin: 0 }}>
            {canConfigure && <button type="button" className="ghost small-btn" onClick={() => setShowConfig((value) => !value)}>{showConfig ? 'Fechar configuração' : 'Configurar página'}</button>}
            {onExit && <button type="button" className="ghost small-btn" onClick={onExit}>Ir para a Agenda completa</button>}
          </div>
        </div>
      </header>

      <div className="landing-main-wrap">
        {/* Banner Card em Destaque */}
        {service.landingBannerUrl ? (
          <div className="landing-banner-card">
            <img
              src={service.landingBannerUrl}
              alt={`Banner de ${service.name}`}
              className="landing-banner-card-img"
            />
          </div>
        ) : null}

        {/* Informações do Atendimento */}
        <div className="landing-info-card">
          <p className="eyebrow" style={{ color: 'var(--brand-2)', fontWeight: 700 }}>Prefeitura de Garça · Agendamento</p>
          <h1 style={{ margin: '.2rem 0 .4rem', fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', color: '#0f172a' }}>{service.name}</h1>
          {service.description && <p className="landing-lead" style={{ color: '#475569', margin: '0 0 .6rem' }}>{service.description}</p>}
          <address className="landing-address" style={{ color: '#334155', fontStyle: 'normal', fontSize: '.95rem' }}>📍 <b>{unit.name}</b>{address ? ` · ${address}` : ''}</address>
          {period.length > 0 && (
            <p className="landing-period" style={{ margin: '.4rem 0 0', fontSize: '.9rem', color: '#64748b' }}>📅 Período de agendamento: <b>{period[0] ? new Date(`${period[0]}T12:00:00`).toLocaleDateString('pt-BR') : 'aberto'}</b> até <b>{period[1] ? new Date(`${period[1]}T12:00:00`).toLocaleDateString('pt-BR') : 'enquanto houver vagas'}</b></p>
          )}
          <ul className="landing-meta" style={{ marginTop: '.8rem' }}>
            <li>⏱️ {service.durationMinutes} min</li>
            <li>👥 {service.capacity} vaga(s)</li>
            {(service.resourceIds || []).filter((item) => item.active && item.type === 'attendant').map((item) => (
              <li key={item._id}>👤 {item.name}</li>
            ))}
          </ul>
        </div>

        <section className="landing-body card">
        {showConfig && canConfigure && (
          <LandingEditor
            service={service}
            unit={unit}
            onSaved={(updated) => setPack((current) => ({ ...current, service: { ...current.service, ...updated }, address: updated.landingAddress || current.address }))}
          />
        )}

        {bookingComplete ? (
          <div className="landing-voucher-complete" style={{ background: '#fff', borderRadius: '1.2rem', padding: '2rem 1.5rem', border: '2px solid #22c55e', textAlign: 'center', boxShadow: '0 8px 30px rgba(34,197,94,0.12)' }}>
            <div style={{ fontSize: '3.8rem', lineHeight: 1, marginBottom: '.8rem' }}>🎉</div>
            <h2 style={{ color: '#065f46', fontSize: '1.8rem', margin: '0 0 .5rem', fontWeight: 800 }}>Agendamento Confirmado!</h2>
            <p style={{ color: '#475569', fontSize: '1.05rem', margin: '0 0 1.5rem' }}>
              Seu horário foi reservado com sucesso! Um comprovante oficial foi enviado para o seu e-mail.
            </p>

            <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', maxWidth: '500px', margin: '0 auto 1.8rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '.75rem', marginBottom: '.75rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Protocolo Oficial:</span>
                <code style={{ background: '#eff6ff', color: '#0b5fff', fontWeight: 800, fontSize: '1.15rem', padding: '.2rem .6rem', borderRadius: '.4rem' }}>{bookingComplete.protocol}</code>
              </div>
              {bookingComplete.panelTicket ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '.75rem', marginBottom: '.75rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Senha no Painel (TV):</span>
                  <strong style={{ color: '#1d4ed8', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '.08em' }}>{bookingComplete.panelTicket}</strong>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '.75rem', marginBottom: '.75rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Serviço:</span>
                <strong style={{ color: '#0f172a' }}>{service.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '.75rem', marginBottom: '.75rem', gap: '1rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600, flexShrink: 0 }}>Local:</span>
                <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>
                  {unit.name}
                  {address ? (
                    <>
                      <br />
                      <small style={{ color: '#64748b', fontWeight: 500 }}>{address}</small>
                    </>
                  ) : null}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.2rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Data e Horário:</span>
                <strong style={{ color: '#047857', fontSize: '1.1rem' }}>
                  📅 {new Date(bookingComplete.startsAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                </strong>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '.8rem', padding: '.9rem 1.2rem', maxWidth: '500px', margin: '0 auto 1.8rem', color: '#065f46', fontSize: '.9rem', textAlign: 'left' }}>
              📌 <b>Dica:</b> Chegue com 10 minutos de antecedência portando documento de identificação com foto.
              {bookingComplete.panelTicket ? (
                <> No dia do atendimento, fique atento ao <b>painel da TV</b> — sua senha será <b>{bookingComplete.panelTicket}</b>.</>
              ) : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => window.print()} style={{ background: '#0f172a', color: '#fff', padding: '.85rem 1.6rem', borderRadius: '.8rem', fontWeight: 700, fontSize: '.95rem' }}>
                🖨️ Imprimir Comprovante
              </button>
              <button type="button" className="ghost" onClick={() => { setBookingComplete(null); setPendingSlot(null); setSuccessMsg(''); }} style={{ padding: '.85rem 1.6rem', borderRadius: '.8rem', fontWeight: 700, fontSize: '.95rem', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#1e293b' }}>
                ➕ Realizar Outro Agendamento
              </button>
            </div>
          </div>
        ) : (
          <>
            {successMsg && (
              <div className="notice" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', fontSize: '1rem', padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
                {successMsg}
              </div>
            )}

            {notice && !successMsg && (
              <p className="notice" style={{ marginBottom: '1.5rem' }}>{notice}</p>
            )}

            {/* Calendário de Horários */}
            <BookingCalendar
              key={`${service._id}-${service.bookingFrom}-${service.bookingUntil}`}
              service={service}
              availabilityPath={availabilityPath}
              onBook={book}
            />

            {/* Seção de Autenticação / Cadastro (quando não logado) */}
            {!logged && (
              <div id="landing-auth-section" className="landing-login" style={{ marginTop: '2rem', paddingTop: '1.8rem', borderTop: '2px solid var(--line)' }}>
                <div className="section-title" style={{ marginBottom: '1rem' }}>
                  <div>
                    <p className="eyebrow">Finalizar Agendamento</p>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>
                      {pendingSlot ? `Confirmar reserva para ${new Date(pendingSlot).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Identificação do Cidadão'}
                    </h2>
                  </div>
                </div>

                {pendingSlot && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '.8rem', padding: '.9rem 1.2rem', marginBottom: '1.2rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '.8rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📅</span>
                    <div>
                      <strong>Horário Selecionado: {new Date(pendingSlot).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</strong>
                      <p style={{ margin: '.2rem 0 0', fontSize: '.85rem', color: '#3b82f6' }}>Preencha abaixo para confirmar sua vaga imediatamente.</p>
                    </div>
                  </div>
                )}

                {/* Alternância de Abas: Criar Cadastro / Já sou Cadastrado */}
                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
                  <button
                    type="button"
                    className={authTab === 'register' ? '' : 'ghost'}
                    style={{ borderRadius: '.6rem', padding: '.6rem 1.2rem', fontWeight: 700, ...(authTab !== 'register' ? { color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1' } : {}) }}
                    onClick={() => { setAuthTab('register'); setNotice('') }}
                  >
                    📝 Primeiro acesso (Cadastre-se)
                  </button>
                  <button
                    type="button"
                    className={authTab === 'login' ? '' : 'ghost'}
                    style={{ borderRadius: '.6rem', padding: '.6rem 1.2rem', fontWeight: 700, ...(authTab !== 'login' ? { color: '#475569', background: '#f1f5f9', border: '1px solid #cbd5e1' } : {}) }}
                    onClick={() => { setAuthTab('login'); setNotice('') }}
                  >
                    🔑 Já possuo cadastro
                  </button>
                </div>

                {/* Formulário: Já possuo cadastro */}
                {authTab === 'login' && (
                  <form onSubmit={handleLogin}>
                    <p className="form-help" style={{ marginTop: 0 }}>Entre com o seu e-mail e senha cadastrados na plataforma municipal.</p>
                    <div className="compact-fields">
                      <label>E-mail
                        <input type="email" required placeholder="seuemail@exemplo.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                      </label>
                      <label>Senha
                        <input type="password" required placeholder="Sua senha" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                      </label>
                    </div>
                    {notice && authTab === 'login' && (
                      <div role="alert" style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: '.7rem', padding: '.75rem 1rem', marginTop: '.8rem', fontWeight: 600, fontSize: '.9rem' }}>
                        {notice}
                      </div>
                    )}
                    <div className="form-actions" style={{ marginTop: '1rem' }}>
                      <button type="submit" disabled={busy}>
                        {busy ? '⏳ Entrando...' : (pendingSlot ? '🔑 Entrar e Confirmar Reserva' : '🔑 Entrar na Conta')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Formulário: Criar novo cadastro */}
                {authTab === 'register' && (
                  <form onSubmit={handleRegister}>
                    <p className="form-help" style={{ marginTop: 0 }}>Cadastre-se rapidamente para confirmar sua reserva e receber o comprovante.</p>
                    
                    <label>Nome Completo
                      <input type="text" required maxLength="160" placeholder="Ex.: Maria Souza Santos" value={regName} onChange={(e) => setRegName(e.target.value)} />
                    </label>

                    <div className="compact-fields">
                      <label>CPF
                        <input type="text" required maxLength="14" placeholder="000.000.000-00" value={regCpf} onChange={(e) => setRegCpf(formatCpf(e.target.value))} />
                      </label>
                      <label>Celular / WhatsApp
                        <input type="tel" required maxLength="15" placeholder="(14) 99999-9999" value={regPhone} onChange={(e) => setRegPhone(formatPhone(e.target.value))} />
                      </label>
                    </div>

                    <label>E-mail
                      <input type="email" required maxLength="160" placeholder="seuemail@exemplo.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                    </label>

                    <div className="compact-fields">
                      <label>Criar Senha
                        <input type="password" required minLength="6" placeholder="Mínimo 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                      </label>
                      <label>Confirmar Senha
                        <input type="password" required minLength="6" placeholder="Repita a senha" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} />
                      </label>
                    </div>

                    <label className="toggle-row" style={{ marginTop: '.8rem' }}>
                      <input type="checkbox" checked={regTerms} onChange={(e) => setRegTerms(e.target.checked)} />
                      <span style={{ fontSize: '.88rem' }}>Li e concordo com os Termos de Uso e Política de Privacidade de Garça.</span>
                    </label>

                    {notice && authTab === 'register' && (
                      <div role="alert" style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: '.7rem', padding: '.75rem 1rem', marginTop: '.8rem', fontWeight: 600, fontSize: '.9rem' }}>
                        {notice}
                      </div>
                    )}

                    <div className="form-actions" style={{ marginTop: '1.2rem' }}>
                      <button type="submit" disabled={busy} style={{ background: '#22c55e', color: '#052e16', fontWeight: 800, padding: '.85rem 1.4rem' }}>
                        {busy ? '⏳ Criando cadastro e confirmando...' : (pendingSlot ? '✅ Cadastrar e Confirmar Agendamento' : '✅ Criar Cadastro')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Seção quando já estiver logado */}
            {logged && currentUser && (
              <div style={{ marginTop: '2rem', padding: '1rem 1.4rem', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
                  <span className="avatar" style={{ width: '2.4rem', height: '2.4rem' }}>{(currentUser.name || '?').slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>Conectado como: {currentUser.name}</strong>
                    <small className="muted" style={{ display: 'block' }}>✉️ {currentUser.email}</small>
                  </div>
                </div>
                {pendingSlot && (
                  <button type="button" disabled={busy} onClick={() => performBooking(pendingSlot)}>
                    {busy ? 'Confirmando...' : `Confirmar para ${new Date(pendingSlot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>
      </div>
    </main>
  )
}

