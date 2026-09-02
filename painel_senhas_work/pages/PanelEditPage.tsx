import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSpeechVoices } from '../hooks/useSpeechVoices'
import { fetchServicosUnidade, fetchUnidades } from '../services/api/unidades'
import { SPEECH_VOICE_AUTO_FEMALE } from '../services/speech/voices'
import { getPanel, updatePanel } from '../services/api/panelsApi'
import { requestPasswordToken } from '../services/api/auth'
import { loadTokens, saveCredentials, saveTokens } from '../services/storage/sessionAuth'
import type { MediaItemConfig, SessionCredentials, UnitBinding } from '../types/config'
import type { ManagedPanel } from '../types/panel'
import type { NovoSgaServicoUnidade, NovoSgaUnidade } from '../types/novosga'
import { readEnv } from '../config/env'
import { TvDisplayPicker, type TvDisplayOption } from '../features/media/TvDisplayPicker'
import './AdminPanelsPage.css'

export function PanelEditPage() {
  const { panelId = '' } = useParams()
  const navigate = useNavigate()
  const env = readEnv()
  const voiceOptionsRaw = useSpeechVoices(true)
  const [panel, setPanel] = useState<ManagedPanel | null>(null)
  const voiceOptions = useMemo(() => {
    const current = panel?.speechVoice || SPEECH_VOICE_AUTO_FEMALE
    if (voiceOptionsRaw.some((o) => o.value === current)) return voiceOptionsRaw
    return [...voiceOptionsRaw, { value: current, label: 'Voz salva (Google/sistema)' }]
  }, [panel?.speechVoice, voiceOptionsRaw])
  const [status, setStatus] = useState('')
  const [unities, setUnities] = useState<NovoSgaUnidade[]>([])
  const [servicesByUnit, setServicesByUnit] = useState<Record<number, NovoSgaServicoUnidade[]>>({})
  const [credentials, setCredentials] = useState<SessionCredentials>({
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
  })
  const [manualUnitId, setManualUnitId] = useState('')
  const [manualUnitName, setManualUnitName] = useState('')
  const [newMedia, setNewMedia] = useState({
    type: 'image' as 'image' | 'video',
    src: '',
    label: '',
  })

  useEffect(() => {
    void getPanel(panelId)
      .then((data) => {
        const envDefaults = readEnv()
        setPanel({
          ...data,
          novosgaApiUrl: data.novosgaApiUrl || envDefaults.apiUrl || 'http://10.15.25.31',
          mercurePublicUrl:
            data.mercurePublicUrl ||
            envDefaults.mercureUrl ||
            'http://10.15.25.31:3000/.well-known/mercure',
          displayLayout: data.displayLayout === 'programacao' ? 'programacao' : 'classic',
          widgetsEnabled: data.widgetsEnabled !== false,
          weatherCity: data.weatherCity || 'Garça',
          rssFeedUrl: data.rssFeedUrl || 'https://g1.globo.com/rss/g1/',
          speechVoice: data.speechVoice || 'auto-female',
          mediaItems: data.mediaItems || [],
        })
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : 'Painel não encontrado')
      })
  }, [panelId])

  async function ensureAuth() {
    const cleaned: SessionCredentials = {
      clientId: credentials.clientId.trim(),
      clientSecret: credentials.clientSecret.trim(),
      username: credentials.username.trim(),
      password: credentials.password,
    }
    if (!cleaned.clientId || !cleaned.clientSecret || !cleaned.username || !cleaned.password) {
      throw new Error('Preencha Client ID, Client Secret, usuário e senha antes de testar.')
    }
    setCredentials(cleaned)
    saveCredentials(cleaned)
    const apiUrl = (panel?.novosgaApiUrl || env.apiUrl || 'http://10.15.25.31').trim()
    const tokens = await requestPasswordToken(apiUrl, cleaned)
    saveTokens(tokens)
    return tokens.accessToken
  }

  async function loadCatalog() {
    if (!panel) return
    setStatus('Autenticando no NovoSGA e carregando unidades...')
    try {
      const apiUrl = (panel.novosgaApiUrl || env.apiUrl || 'http://10.15.25.31').trim()
      if (!panel.novosgaApiUrl) {
        setPanel({ ...panel, novosgaApiUrl: apiUrl })
      }
      const token = await ensureAuth()
      const list = await fetchUnidades(apiUrl, token)
      setUnities(list)
      setStatus(
        list.length
          ? `OK: ${list.length} unidade(s) carregada(s). Clique em uma abaixo para adicionar ao painel.`
          : 'Autenticou, mas o NovoSGA não retornou unidades.',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar unidades'
      setStatus(`Erro: ${message}`)
    }
  }

  async function loadServicesFor(unitId: number) {
    if (!panel) return
    try {
      const token = loadTokens()?.accessToken || (await ensureAuth())
      const list = await fetchServicosUnidade(panel.novosgaApiUrl || env.apiUrl, token, unitId)
      setServicesByUnit((prev) => ({ ...prev, [unitId]: list }))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao carregar serviços')
    }
  }

  function upsertUnit(binding: UnitBinding) {
    if (!panel) return
    const current = panel.units || []
    const idx = current.findIndex((u) => u.id === binding.id)
    const units = idx >= 0 ? current.map((u, i) => (i === idx ? binding : u)) : [...current, binding]
    setPanel({ ...panel, units })
  }

  function removeUnit(unitId: number) {
    if (!panel) return
    setPanel({ ...panel, units: (panel.units || []).filter((u) => u.id !== unitId) })
  }

  function addManualUnit() {
    const id = Number(manualUnitId)
    if (!panel || !Number.isFinite(id) || id <= 0) return
    const existing = panel.units.find((u) => u.id === id)
    upsertUnit({
      id,
      name: manualUnitName.trim() || existing?.name || unities.find((u) => u.id === id)?.nome || `Unidade ${id}`,
      serviceIds: existing?.serviceIds || [],
    })
    void loadServicesFor(id)
    setManualUnitId('')
    setManualUnitName('')
  }

  function toggleService(unitId: number, serviceId: number) {
    const current = panel?.units.find((u) => u.id === unitId)
    if (!current) return
    const exists = current.serviceIds.includes(serviceId)
    upsertUnit({
      ...current,
      serviceIds: exists
        ? current.serviceIds.filter((s) => s !== serviceId)
        : [...current.serviceIds, serviceId],
    })
  }

  function addMedia() {
    if (!panel || !newMedia.src.trim()) return
    const src = newMedia.src.trim()
    const bare = src.split('?')[0].split('#')[0].toLowerCase()
    const looksImage = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(bare)
    const looksVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(bare)
    if (!looksImage && !looksVideo) {
      setStatus('Informe uma URL direta de imagem ou vídeo válida.')
      return
    }
    const type: 'image' | 'video' = looksVideo ? 'video' : 'image'

    const item: MediaItemConfig = {
      id: crypto.randomUUID(),
      type,
      src,
      label: newMedia.label.trim() || undefined,
    }
    setPanel({
      ...panel,
      mediaEnabled: true,
      mediaItems: [...(panel.mediaItems || []), item],
    })
    setNewMedia({ type: 'image', src: '', label: '' })
  }

  async function selectTvDisplay(display: TvDisplayOption | null, playerUrl: string) {
    if (!panel) return
    const mediaItems = (panel.mediaItems || []).filter((item) => item.type !== 'link')
    if (display) {
      mediaItems.unshift({
        id: `tv-display-${display.id}`,
        type: 'link',
        src: playerUrl,
        label: display.displayName,
      })
    }
    const nextPanel = {
      ...panel,
      mediaEnabled: Boolean(display) || panel.mediaEnabled,
      mediaItems,
    }
    setPanel(nextPanel)
    setStatus('Salvando display no painel…')
    try {
      const saved = await updatePanel(panel.id, nextPanel)
      setPanel(saved)
      setStatus(
        display
          ? `Display “${display.displayName}” aplicado ao painel.`
          : 'Display da TV Corporativa removido do painel.',
      )
    } catch (error) {
      setPanel(panel)
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar o display')
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!panel) return
    try {
      const payload = {
        ...panel,
        oauth:
          credentials.clientId &&
          credentials.clientSecret &&
          credentials.username &&
          credentials.password
            ? credentials
            : undefined,
      }
      const saved = await updatePanel(panel.id, payload)
      setPanel(saved)
      setStatus(
        saved.hasOauth
          ? 'Painel salvo. OAuth gravado no servidor — a TV autentica sozinha.'
          : 'Painel salvo. Atenção: sem OAuth gravado a TV não carrega senhas (preencha e salve de novo).',
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar')
    }
  }

  if (!panel) {
    return (
      <div className="admin-page">
        <p>{status || 'Carregando painel…'}</p>
        <Link to="/admin">Voltar</Link>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Editar painel</p>
          <h1>{panel.name}</h1>
          <p>
            Link da TV: <Link to={`/p/${panel.slug}`}>/p/{panel.slug}</Link>
          </p>
        </div>
        <div className="admin-actions">
          <Link to="/admin">Voltar à lista</Link>
          <Link to={`/p/${panel.slug}`}>Abrir painel</Link>
        </div>
      </header>

      <form className="admin-edit" onSubmit={(e) => void handleSave(e)}>
        <section>
          <h2>Identificação</h2>
          <label>
            Nome
            <input value={panel.name} onChange={(e) => setPanel({ ...panel, name: e.target.value })} required />
          </label>
          <label>
            Slug (URL)
            <input value={panel.slug} onChange={(e) => setPanel({ ...panel, slug: e.target.value })} required />
          </label>
          <label>
            Situação
            <select
              value={panel.status}
              onChange={(e) =>
                setPanel({ ...panel, status: e.target.value === 'rascunho' ? 'rascunho' : 'publicado' })
              }
            >
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </label>
        </section>

        <section>
          <h2>Integração NovoSGA</h2>
          <label>
            URL do NovoSGA
            <input
              value={panel.novosgaApiUrl}
              onChange={(e) => setPanel({ ...panel, novosgaApiUrl: e.target.value })}
              placeholder={env.apiUrl || 'http://10.15.25.31'}
            />
          </label>
          <label>
            URL do Mercure
            <input
              value={panel.mercurePublicUrl}
              onChange={(e) => setPanel({ ...panel, mercurePublicUrl: e.target.value })}
              placeholder={env.mercureUrl || 'http://10.15.25.31:3000/.well-known/mercure'}
            />
          </label>
          <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label>
              Client ID (gravado no servidor)
              <input
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder={panel.hasOauth ? '•••• (já gravado — deixe vazio para manter)' : ''}
              />
            </label>
            <label>
              Client Secret (gravado no servidor)
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder={panel.hasOauth ? '•••• (já gravado)' : ''}
              />
            </label>
            <label>
              Usuário (gravado no servidor)
              <input
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder={panel.hasOauth ? '•••• (já gravado)' : ''}
              />
            </label>
            <label>
              Senha (gravada no servidor)
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder={panel.hasOauth ? '•••• (já gravado)' : ''}
              />
            </label>
          </div>
          <p className="admin-hint" style={{ marginTop: '0.5rem' }}>
            {panel.hasOauth
              ? 'OAuth já está no servidor. Preencha de novo só se quiser trocar; ao salvar vazio, mantém o atual.'
              : 'Preencha e salve o painel para a TV autenticar sozinha (sem login manual).'}
          </p>
          <button type="button" onClick={() => void loadCatalog()} style={{ marginTop: '0.75rem' }}>
            Testar e carregar unidades
          </button>
          {status ? (
            <p
              className={status.startsWith('Erro') ? 'admin-error' : 'admin-status'}
              style={{ marginTop: '0.75rem' }}
              role="status"
            >
              {status}
            </p>
          ) : null}
          {unities.length > 0 ? (
            <div style={{ marginTop: '0.85rem' }}>
              <p className="admin-hint">Unidades disponíveis — clique para adicionar:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.45rem' }}>
                {unities.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      upsertUnit({
                        id: u.id,
                        name: u.nome,
                        serviceIds: panel.units.find((x) => x.id === u.id)?.serviceIds || [],
                      })
                      void loadServicesFor(u.id)
                      setStatus(`Unidade ${u.id} — ${u.nome} adicionada. Marque os serviços abaixo.`)
                    }}
                    style={{ background: 'var(--surface-main)', color: 'var(--text)', border: '1px solid var(--border-subtle)' }}
                  >
                    {u.id} — {u.nome}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <h2>Unidades deste painel</h2>
          <p className="admin-hint">Pode adicionar várias unidades neste mesmo painel.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <select
              defaultValue=""
              onChange={(e) => {
                const id = Number(e.target.value)
                if (!id) return
                const meta = unities.find((u) => u.id === id)
                upsertUnit({
                  id,
                  name: meta?.nome || `Unidade ${id}`,
                  serviceIds: panel.units.find((u) => u.id === id)?.serviceIds || [],
                })
                void loadServicesFor(id)
                e.target.value = ''
              }}
            >
              <option value="">Adicionar da API…</option>
              {unities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id} — {u.nome}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="ID manual"
              value={manualUnitId}
              onChange={(e) => setManualUnitId(e.target.value)}
              style={{ minWidth: '8rem' }}
            />
            <input
              placeholder="Nome"
              value={manualUnitName}
              onChange={(e) => setManualUnitName(e.target.value)}
            />
            <button type="button" onClick={addManualUnit}>
              Adicionar
            </button>
          </div>

          {(panel.units || []).map((unit) => (
            <article key={unit.id} style={{ marginTop: '1rem', padding: '0.85rem', border: '1px solid var(--border-subtle)', borderRadius: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong>
                  {unit.id} — {unit.name}
                </strong>
                <div className="admin-actions">
                  <button type="button" onClick={() => void loadServicesFor(unit.id)}>
                    Carregar serviços
                  </button>
                  <button type="button" onClick={() => removeUnit(unit.id)}>
                    Remover
                  </button>
                </div>
              </div>
              <label>
                Nome
                <input value={unit.name} onChange={(e) => upsertUnit({ ...unit, name: e.target.value })} />
              </label>
              <label>
                IDs serviços (vírgula)
                <input
                  value={unit.serviceIds.join(',')}
                  onChange={(e) =>
                    upsertUnit({
                      ...unit,
                      serviceIds: e.target.value
                        .split(',')
                        .map((p) => Number(p.trim()))
                        .filter((n) => n > 0),
                    })
                  }
                />
              </label>
              <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
                {(servicesByUnit[unit.id] || []).map((su) => (
                  <label key={su.servico.id} style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={unit.serviceIds.includes(su.servico.id)}
                      onChange={() => toggleService(unit.id, su.servico.id)}
                    />
                    {su.sigla ? `${su.sigla} — ` : ''}
                    {su.servico.nome} ({su.servico.id})
                  </label>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section>
          <h2>Voz e som</h2>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={panel.speechEnabled}
              onChange={(e) => setPanel({ ...panel, speechEnabled: e.target.checked })}
            />
            Habilitar voz (pt-BR)
          </label>
          <div className="admin-grid">
            <label>
              Volume ({panel.speechVolume.toFixed(2)})
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={panel.speechVolume}
                onChange={(e) => setPanel({ ...panel, speechVolume: Number(e.target.value) })}
              />
            </label>
            <label>
              Velocidade ({panel.speechRate.toFixed(2)})
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={panel.speechRate}
                onChange={(e) => setPanel({ ...panel, speechRate: Number(e.target.value) })}
              />
            </label>
            <label>
              Voz
              <select
                value={panel.speechVoice || SPEECH_VOICE_AUTO_FEMALE}
                onChange={(e) => setPanel({ ...panel, speechVoice: e.target.value })}
              >
                {voiceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="admin-hint">
            Na TV, abra Configurações ou use o admin para listar todas as vozes instaladas no
            Windows. Recomendado: Microsoft Francisca (pt-BR).
          </p>
        </section>

        <section>
          <h2>Identidade visual</h2>
          <label>
            Título
            <input
              value={panel.panelTitle}
              onChange={(e) => setPanel({ ...panel, panelTitle: e.target.value })}
            />
          </label>
          <label>
            Instituição
            <input
              value={panel.institutionName}
              onChange={(e) => setPanel({ ...panel, institutionName: e.target.value })}
            />
          </label>
          <label>
            Cor principal
            <input
              type="color"
              value={panel.primaryColor}
              onChange={(e) => setPanel({ ...panel, primaryColor: e.target.value })}
            />
          </label>
          <label>
            Tema
            <select
              value={panel.theme}
              onChange={(e) => setPanel({ ...panel, theme: e.target.value === 'light' ? 'light' : 'dark' })}
            >
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </label>
          <label>
            Layout da tela
            <select
              value={panel.displayLayout || 'classic'}
              onChange={(e) =>
                setPanel({
                  ...panel,
                  displayLayout: e.target.value === 'programacao' ? 'programacao' : 'classic',
                })
              }
            >
              <option value="classic">Clássico (senha + lateral)</option>
              <option value="programacao">Programação 9:16 (coluna à esquerda)</option>
            </select>
          </label>
          <p className="admin-hint">
            Programação 9:16: a seção <strong>Mídia / programação</strong> logo abaixo é onde você
            escolhe o display da TV Corporativa exibido na coluna esquerda.
          </p>
        </section>

        <section>
          <h2>TV Corporativa / programação</h2>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={panel.mediaEnabled !== false}
              onChange={(e) => setPanel({ ...panel, mediaEnabled: e.target.checked })}
            />
            Habilitar mídia / coluna de programação
          </label>
          <TvDisplayPicker
            selectedUrl={(panel.mediaItems || []).find((item) => item.type === 'link')?.src}
            onSelect={(display, playerUrl) => void selectTvDisplay(display, playerUrl)}
          />
          <h3>Imagens e vídeos adicionais</h3>
          <div className="admin-media-add">
            <select
              value={newMedia.type}
              onChange={(e) =>
                setNewMedia({ ...newMedia, type: e.target.value as 'image' | 'video' })
              }
            >
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
            </select>
            <input
              placeholder="URL direta do arquivo de imagem/vídeo"
              value={newMedia.src}
              onChange={(e) => setNewMedia({ ...newMedia, src: e.target.value })}
            />
            <input
              placeholder="Rótulo (opcional)"
              value={newMedia.label}
              onChange={(e) => setNewMedia({ ...newMedia, label: e.target.value })}
            />
            <button type="button" onClick={addMedia}>
              Adicionar
            </button>
          </div>
          <p className="admin-hint">A escolha do display é salva imediatamente e aparece somente no painel.</p>
          <ul className="admin-media-list">
            {(panel.mediaItems || []).map((item) => (
              <li key={item.id}>
                <span>
                  [{item.type}] {item.label || item.src}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPanel({
                      ...panel,
                      mediaItems: (panel.mediaItems || []).filter((m) => m.id !== item.id),
                    })
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Widgets de apoio (clima e notícias)</h2>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={panel.widgetsEnabled !== false}
              onChange={(e) => setPanel({ ...panel, widgetsEnabled: e.target.checked })}
            />
            Mostrar clima e letreiro na área institucional (quando não houver mídia)
          </label>
          <label>
            Cidade para previsão do tempo
            <input
              value={panel.weatherCity || ''}
              onChange={(e) => setPanel({ ...panel, weatherCity: e.target.value })}
              placeholder="Garça"
            />
          </label>
          <label>
            URL do feed RSS (letreiro / ticker)
            <input
              value={panel.rssFeedUrl || ''}
              onChange={(e) => setPanel({ ...panel, rssFeedUrl: e.target.value })}
              placeholder="https://g1.globo.com/rss/g1/"
            />
          </label>
          <p className="admin-hint">
            Exemplo G1: https://g1.globo.com/rss/g1/ — as manchetes rolam no rodapé do card.
          </p>
        </section>

        {status ? <p className="admin-status">{status}</p> : null}

        <div className="admin-actions">
          <button type="submit">Salvar painel</button>
          <button type="button" onClick={() => navigate('/admin')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
