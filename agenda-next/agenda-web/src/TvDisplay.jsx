import { useEffect, useRef, useState } from 'react'
import { api } from './api'

export default function TvDisplay() {
  const [currentCall, setCurrentCall] = useState(null)
  const [history, setHistory] = useState([])
  const [clock, setClock] = useState('')
  const [connected, setConnected] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const lastAnnouncedId = useRef(null)

  // Relógio em tempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Síntese de Voz e Som de Chamada
  function speakCall(call) {
    if (!('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const text = `Senha ${call.senha || call.ticket || 'AG01'}. ${call.nomeCliente || call.clientName || 'Cidadão'}, dirigir-se ao ${call.local || call.localName || 'Guichê'} ${call.numeroLocal || call.localNumber || 1}.`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'
      utterance.rate = 0.95
      utterance.pitch = 1.0

      // Tentar obter voz em português
      const voices = window.speechSynthesis.getVoices()
      const ptVoice = voices.find((v) => v.lang.includes('pt-BR') || v.lang.includes('pt'))
      if (ptVoice) utterance.voice = ptVoice

      window.speechSynthesis.speak(utterance)
    } catch (_e) {}
  }

  function handleNewCall(call) {
    if (!call || call.id === lastAnnouncedId.current) return
    lastAnnouncedId.current = call.id
    setCurrentCall(call)
    setHistory((prev) => [call, ...prev.filter((c) => c.id !== call.id)].slice(0, 5))
    speakCall(call)
  }

  // Conexão SSE e Polling
  useEffect(() => {
    let eventSource = null
    let pollInterval = null

    // 1. Iniciar SSE
    try {
      eventSource = new EventSource('/api/agenda/public/panels/events')
      eventSource.onopen = () => setConnected(true)
      eventSource.onerror = () => setConnected(false)
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data && typeof data === 'object' && ('senha' in data || 'ticket' in data)) {
            handleNewCall(data)
          }
        } catch (_err) {}
      }
    } catch (_e) {}

    // 2. Polling de Fallback
    const fetchRecent = async () => {
      try {
        const res = await api('/api/agenda/public/panels/calls')
        if (res.items && res.items.length > 0) {
          const latest = res.items[0]
          if (latest && latest.id !== lastAnnouncedId.current) {
            handleNewCall(latest)
          }
        }
      } catch (_e) {}
    }
    fetchRecent()
    pollInterval = setInterval(fetchRecent, 3000)

    return () => {
      if (eventSource) eventSource.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0f1d',
      color: '#ffffff',
      fontFamily: "'Rubik', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 32px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="./logos/logo_agenda_fundoescuro.png" alt="Prefeitura de Garça" style={{ height: '48px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '1px' }}>PAINEL DE ATENDIMENTO</h1>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Secretaria Municipal de Informática e Tecnologia — SEMIT</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: connected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: `1px solid ${connected ? '#10b981' : '#ef4444'}`,
          }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: connected ? '#10b981' : '#ef4444' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: connected ? '#34d399' : '#f87171' }}>
              {connected ? 'ONLINE' : 'RECONECTANDO'}
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
            {clock}
          </div>
        </div>
      </header>

      {/* Aviso para ativar áudio se necessário */}
      {!audioUnlocked && (
        <div
          onClick={() => {
            setAudioUnlocked(true)
            if ('speechSynthesis' in window) {
              const u = new SpeechSynthesisUtterance('Áudio da TV ativado com sucesso')
              u.lang = 'pt-BR'
              window.speechSynthesis.speak(u)
            }
          }}
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#1e3a8a',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '0.95rem',
            color: '#93c5fd',
            border: '1px dashed #60a5fa',
          }}
        >
          🔊 <strong>Clique aqui uma vez na tela da TV</strong> para liberar a voz automática e os alertas sonoros do navegador.
        </div>
      )}

      {/* Corpo Principal */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px', marginTop: '24px' }}>
        {/* Card de Chamada Principal */}
        <div style={{
          backgroundColor: '#131c31',
          borderRadius: '20px',
          border: '2px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {currentCall ? (
            <>
              <div style={{
                position: 'absolute',
                top: '20px',
                padding: '8px 24px',
                backgroundColor: 'rgba(11,95,255,0.2)',
                border: '1px solid #0b5fff',
                borderRadius: '30px',
                color: '#60a5fa',
                fontWeight: 700,
                fontSize: '1.1rem',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}>
                {currentCall.servico?.nome || currentCall.serviceName || 'ATENDIMENTO'}
              </div>

              <div style={{
                fontSize: 'clamp(5rem, 14vw, 10rem)',
                fontWeight: 900,
                color: '#38bdf8',
                letterSpacing: '4px',
                lineHeight: 1,
                margin: '30px 0 20px',
                textShadow: '0 0 40px rgba(56,189,248,0.4)',
              }}>
                {currentCall.senha || currentCall.ticket || 'AG01'}
              </div>

              <div style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                {currentCall.local || currentCall.localName || 'Guichê'} {String(currentCall.numeroLocal || currentCall.localNumber || 1).padStart(2, '0')}
              </div>

              {(currentCall.nomeCliente || currentCall.clientName) && (
                <div style={{
                  fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                  fontWeight: 600,
                  color: '#94a3b8',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  padding: '10px 30px',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  👤 {currentCall.nomeCliente || currentCall.clientName}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📺</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#94a3b8', margin: 0 }}>Aguardando próxima chamada...</h2>
              <p style={{ margin: '8px 0 0', fontSize: '1.1rem' }}>As senhas chamadas pelo atendente aparecerão aqui automaticamente.</p>
            </div>
          )}
        </div>

        {/* Lateral: Últimas Chamadas */}
        <aside style={{
          backgroundColor: '#131c31',
          borderRadius: '20px',
          border: '1px solid #1e293b',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '10px',
          }}>
            Últimas Chamadas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {history.length > 0 ? (
              history.map((call, idx) => (
                <div
                  key={call.id || idx}
                  style={{
                    backgroundColor: idx === 0 ? 'rgba(11,95,255,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${idx === 0 ? '#0b5fff' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: idx === 0 ? '#38bdf8' : '#e2e8f0' }}>
                      {call.senha || call.ticket || 'AG01'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '2px' }}>
                      {call.nomeCliente || call.clientName || 'Cidadão'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                      {call.local || call.localName || 'Guichê'} {String(call.numeroLocal || call.localNumber || 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      {call.servico?.nome || call.serviceName || 'Atendimento'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#475569', marginTop: '40px' }}>
                Nenhuma chamada anterior
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
