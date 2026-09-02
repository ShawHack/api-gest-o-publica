import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fetchServicosUnidade, fetchUnidades } from '../services/api/unidades'
import { getPanel, updatePanel } from '../services/api/panelsApi'
import { useSpeechVoices } from '../hooks/useSpeechVoices'
import { buildAnnouncementParts } from '../services/speech/announceCall'
import { playAlertChime } from '../services/speech/alertSound'
import { SpeechQueue } from '../services/speech/speechQueue'
import { SPEECH_VOICE_AUTO_FEMALE } from '../services/speech/voices'
import {
  getStoredAdminPinHash,
  setAdminPin,
  verifyAdminPin,
} from '../services/storage/localConfig'
import {
  isAdminUnlocked,
  loadCredentials,
  loadTokens,
  saveCredentials,
  setAdminUnlocked,
} from '../services/storage/sessionAuth'
import type { MediaItemConfig, PanelSettings, SessionCredentials, UnitBinding } from '../types/config'
import type { NovoSgaServicoUnidade, NovoSgaUnidade } from '../types/novosga'
import { usePanel } from '../features/calls/usePanel'
import { TvDisplayPicker } from '../features/media/TvDisplayPicker'
import { settingsToManagedInput } from '../utils/panelMapper'
import { normalizeUnits, syncLegacyUnitFields } from '../utils/units'
import './SettingsPage.css'

export function SettingsPage() {
  const { settings, updateSettings, ensureSession, reconnect, unlockSound, managedSlug } = usePanel()
  const voiceOptionsRaw = useSpeechVoices(true)
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked())
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [draft, setDraft] = useState<PanelSettings | null>(null)
  const form = draft ?? settings
  const setForm = (updater: PanelSettings | ((prev: PanelSettings) => PanelSettings)) => {
    setDraft((current) => {
      const base = current ?? settings
      return typeof updater === 'function' ? updater(base) : updater
    })
  }
  const [credentials, setCredentials] = useState<SessionCredentials>(
    () =>
      loadCredentials() ?? {
        clientId: '',
        clientSecret: '',
        username: '',
        password: '',
      },
  )
  const [unities, setUnities] = useState<NovoSgaUnidade[]>([])
  const [servicesByUnit, setServicesByUnit] = useState<Record<number, NovoSgaServicoUnidade[]>>({})
  const [status, setStatus] = useState('')
  const [newMedia, setNewMedia] = useState({
    type: 'image' as 'image' | 'video',
    src: '',
    label: '',
  })
  const [newPin, setNewPin] = useState('')
  const [manualUnitId, setManualUnitId] = useState('')
  const [manualUnitName, setManualUnitName] = useState('')

  const units = normalizeUnits(form)

  const voiceOptions = useMemo(() => {
    const current = form.speechVoice || SPEECH_VOICE_AUTO_FEMALE
    if (voiceOptionsRaw.some((opt) => opt.value === current)) return voiceOptionsRaw
    return [
      ...voiceOptionsRaw,
      {
        value: current,
        label: current.startsWith('auto') ? current : `Voz salva (Google/sistema)`,
      },
    ]
  }, [form.speechVoice, voiceOptionsRaw])

  async function testSpeech() {
    try {
      await unlockSound()
      const queue = new SpeechQueue({ playAlert: (v) => playAlertChime(v) })
      queue.markUnlocked()
      queue.enqueue({
        id: 'test',
        parts: buildAnnouncementParts({
          id: 1,
          ticket: 'A123',
          prefix: 'A',
          number: 123,
          localName: 'Guichê',
          localNumber: 4,
          localLabel: 'Guichê 04',
          serviceId: 1,
          serviceName: 'Teste',
          priorityName: 'Normal',
          priorityWeight: 0,
          priorityColor: null,
          clientName: null,
          calledAt: new Date().toISOString(),
          source: 'demo',
        }),
        lang: 'pt-BR',
        volume: form.speechVolume,
        rate: form.speechRate,
        voicePreference: form.speechVoice || SPEECH_VOICE_AUTO_FEMALE,
        playAlertFirst: true,
      })
      setStatus('Teste de voz enviado.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha no teste de voz')
    }
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault()
    const ok = await verifyAdminPin(pin)
    if (!ok) {
      setPinError('PIN incorreto')
      return
    }
    setAdminUnlocked(true)
    setUnlocked(true)
    setPinError('')
  }

  async function loadCatalog() {
    setStatus('Carregando unidades...')
    try {
      await ensureSession(credentials)
      const token = loadTokens()
      if (!token?.accessToken) throw new Error('Token ausente')
      const list = await fetchUnidades(form.novosgaApiUrl, token.accessToken)
      setUnities(list)
      setStatus(`${list.length} unidade(s) carregada(s). Adicione quantas precisar abaixo.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao carregar unidades')
    }
  }

  async function loadServicesFor(unitId: number) {
    try {
      await ensureSession(credentials)
      const token = loadTokens()
      if (!token?.accessToken) throw new Error('Token ausente')
      const list = await fetchServicosUnidade(form.novosgaApiUrl, token.accessToken, unitId)
      setServicesByUnit((prev) => ({ ...prev, [unitId]: list }))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao carregar serviços')
    }
  }

  function upsertUnit(binding: UnitBinding) {
    setForm((prev) => {
      const current = normalizeUnits(prev)
      const idx = current.findIndex((u) => u.id === binding.id)
      const nextUnits =
        idx >= 0
          ? current.map((u, i) => (i === idx ? binding : u))
          : [...current, binding]
      return syncLegacyUnitFields({ ...prev, units: nextUnits })
    })
  }

  function removeUnit(unitId: number) {
    setForm((prev) =>
      syncLegacyUnitFields({
        ...prev,
        units: normalizeUnits(prev).filter((u) => u.id !== unitId),
      }),
    )
  }

  function addUnitFromCatalog(unitId: number) {
    const meta = unities.find((u) => u.id === unitId)
    if (!unitId) return
    if (units.some((u) => u.id === unitId)) {
      setStatus(`Unidade ${unitId} já está na lista`)
      void loadServicesFor(unitId)
      return
    }
    upsertUnit({
      id: unitId,
      name: meta?.nome || `Unidade ${unitId}`,
      serviceIds: [],
    })
    void loadServicesFor(unitId)
  }

  function addManualUnit() {
    const id = Number(manualUnitId)
    if (!Number.isFinite(id) || id <= 0) {
      setStatus('Informe um ID de unidade válido')
      return
    }
    const existing = units.find((u) => u.id === id)
    upsertUnit({
      id,
      name: manualUnitName.trim() || existing?.name || unities.find((u) => u.id === id)?.nome || `Unidade ${id}`,
      serviceIds: existing?.serviceIds ?? [],
    })
    void loadServicesFor(id)
    setManualUnitId('')
    setManualUnitName('')
  }

  function toggleService(unitId: number, serviceId: number) {
    const current = units.find((u) => u.id === unitId)
    if (!current) return
    const exists = current.serviceIds.includes(serviceId)
    upsertUnit({
      ...current,
      serviceIds: exists
        ? current.serviceIds.filter((s) => s !== serviceId)
        : [...current.serviceIds, serviceId],
    })
  }

  function setUnitServiceIdsManual(unitId: number, raw: string) {
    const current = units.find((u) => u.id === unitId)
    if (!current) return
    const ids = raw
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
    upsertUnit({ ...current, serviceIds: ids })
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const next = syncLegacyUnitFields(form)
    if (!normalizeUnits(next).some((u) => u.serviceIds.length > 0)) {
      setStatus('Adicione ao menos uma unidade com serviços antes de salvar')
      return
    }
    updateSettings(next)
    if (newPin.trim()) {
      await setAdminPin(newPin.trim())
      setNewPin('')
    }

    // Painel /p/:slug — grava voz e demais ajustes no servidor (senão o bootstrap volta para auto-female).
    if (managedSlug) {
      try {
        const existing = await getPanel(managedSlug)
        await updatePanel(
          managedSlug,
          settingsToManagedInput(next, existing.name, existing.slug),
        )
        setStatus(`Salvo no painel "${existing.name}" (incluindo voz).`)
        reconnect()
        return
      } catch (error) {
        setStatus(
          `Salvo neste navegador, mas falhou no servidor: ${error instanceof Error ? error.message : 'erro'}. Tente pelo /admin.`,
        )
        return
      }
    }

    const hasOauth =
      Boolean(credentials.clientId.trim()) &&
      Boolean(credentials.clientSecret.trim()) &&
      Boolean(credentials.username.trim()) &&
      Boolean(credentials.password)

    if (!hasOauth) {
      setStatus(
        'Configurações salvas neste navegador. Para Sedetur/Semit, abra o painel (/p/...) antes ou edite a voz em /admin.',
      )
      reconnect()
      return
    }

    saveCredentials(credentials)
    setStatus('Configurações salvas (credenciais apenas nesta sessão)')
    try {
      await ensureSession(credentials)
      reconnect()
      setStatus(`Salvo: ${normalizeUnits(next).length} unidade(s) monitorada(s)`)
    } catch (error) {
      setStatus(
        `Configurações salvas. Aviso OAuth: ${error instanceof Error ? error.message : 'falha de autenticação'}.`,
      )
    }
  }

  function addMedia() {
    if (!newMedia.src.trim()) return
    const item: MediaItemConfig = {
      id: crypto.randomUUID(),
      type: newMedia.type,
      src: newMedia.src.trim(),
      label: newMedia.label.trim() || undefined,
    }
    setForm((prev) => ({ ...prev, mediaItems: [...prev.mediaItems, item] }))
    setNewMedia({ type: 'image', src: '', label: '' })
  }

  if (!unlocked) {
    const hasPin = Boolean(getStoredAdminPinHash())
    return (
      <div className="settings-gate">
        <form className="settings-card" onSubmit={(e) => void handleUnlock(e)}>
          <h1>Modo administrativo</h1>
          <p>
            {hasPin
              ? 'Informe o PIN local para editar as configurações do painel.'
              : 'Nenhum PIN definido. Continue para configurar (defina um PIN ao salvar).'}
          </p>
          {hasPin ? (
            <label>
              PIN
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
          ) : null}
          {pinError ? <p className="settings-error">{pinError}</p> : null}
          <div className="settings-actions">
            <button type="submit">Entrar</button>
            <Link to="/">Voltar ao painel</Link>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <div>
          <h1>Configurações do painel</h1>
          <p>Credenciais NovoSGA ficam só na sessão do navegador.</p>
        </div>
        <Link to="/">Voltar ao painel</Link>
      </header>

      <form className="settings-form" onSubmit={(e) => void handleSave(e)}>
        <section>
          <h2>Integração NovoSGA</h2>
          <label>
            URL do NovoSGA
            <input
              value={form.novosgaApiUrl}
              onChange={(e) => setForm({ ...form, novosgaApiUrl: e.target.value })}
              placeholder="https://novosga.exemplo.gov.br"
              required
            />
          </label>
          <label>
            URL pública do Mercure
            <input
              value={form.mercurePublicUrl}
              onChange={(e) => setForm({ ...form, mercurePublicUrl: e.target.value })}
              placeholder="https://novosga.exemplo.gov.br/.well-known/mercure"
            />
          </label>
          <div className="settings-grid">
            <label>
              Client ID (sessão)
              <input
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Client Secret (sessão)
              <input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              Usuário (sessão)
              <input
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                autoComplete="username"
              />
            </label>
            <label>
              Senha (sessão)
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                autoComplete="current-password"
              />
            </label>
          </div>
          <button type="button" onClick={() => void loadCatalog()}>
            Testar e carregar unidades
          </button>
        </section>

        <section>
          <h2>Unidades e serviços</h2>
          <p className="settings-hint">
            A SEMIT pode monitorar <strong>várias unidades</strong> no mesmo painel. Adicione quantas
            forem necessárias; cada uma com seus próprios serviços.
          </p>

          <div className="settings-grid">
            <label>
              Adicionar da lista da API
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = Number(e.target.value)
                  if (id) addUnitFromCatalog(id)
                  e.target.value = ''
                }}
              >
                <option value="">Selecione para adicionar…</option>
                {unities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} — {u.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="settings-grid">
            <label>
              ID manual
              <input
                type="number"
                min={1}
                value={manualUnitId}
                onChange={(e) => setManualUnitId(e.target.value)}
                placeholder="Ex.: 4"
              />
            </label>
            <label>
              Nome manual
              <input
                value={manualUnitName}
                onChange={(e) => setManualUnitName(e.target.value)}
                placeholder="Sec. de Desenvolvimento Econômico"
              />
            </label>
          </div>
          <button type="button" onClick={addManualUnit}>
            Adicionar unidade
          </button>

          {!units.length ? (
            <p className="settings-hint">Nenhuma unidade ainda. Carregue o catálogo ou informe o ID.</p>
          ) : null}

          <div className="settings-units">
            {units.map((unit) => {
              const catalogServices = servicesByUnit[unit.id] || []
              return (
                <article key={unit.id} className="settings-unit-card">
                  <header className="settings-unit-card__head">
                    <div>
                      <strong>
                        {unit.id} — {unit.name}
                      </strong>
                      <p className="settings-hint">
                        {unit.serviceIds.length} serviço(s) selecionado(s)
                      </p>
                    </div>
                    <div className="settings-unit-card__actions">
                      <button type="button" onClick={() => void loadServicesFor(unit.id)}>
                        Carregar serviços
                      </button>
                      <button type="button" onClick={() => removeUnit(unit.id)}>
                        Remover
                      </button>
                    </div>
                  </header>
                  <label>
                    Nome exibido
                    <input
                      value={unit.name}
                      onChange={(e) => upsertUnit({ ...unit, name: e.target.value })}
                    />
                  </label>
                  <label>
                    IDs dos serviços (vírgula)
                    <input
                      value={unit.serviceIds.join(',')}
                      onChange={(e) => setUnitServiceIdsManual(unit.id, e.target.value)}
                      placeholder="75,22,26"
                    />
                  </label>
                  <div className="settings-services">
                    {catalogServices.map((su) => (
                      <label key={su.servico.id} className="settings-check">
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
              )
            })}
          </div>
        </section>

        <section>
          <h2>Identidade visual</h2>
          <div className="settings-grid">
            <label>
              Título do painel
              <input
                value={form.panelTitle}
                onChange={(e) => setForm({ ...form, panelTitle: e.target.value })}
              />
            </label>
            <label>
              Instituição
              <input
                value={form.institutionName}
                onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
              />
            </label>
            <label>
              URL da logomarca
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="/logo-semit.svg ou URL"
              />
            </label>
            <label>
              Cor principal
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              />
            </label>
            <label>
              Tema
              <select
                value={form.theme}
                onChange={(e) => setForm({ ...form, theme: e.target.value as 'light' | 'dark' })}
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
            </label>
            <label>
              Layout da tela
              <select
                value={form.displayLayout || 'classic'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    displayLayout: e.target.value === 'programacao' ? 'programacao' : 'classic',
                  })
                }
              >
                <option value="classic">Clássico (senha + lateral)</option>
                <option value="programacao">Programação 9:16 (coluna à esquerda)</option>
              </select>
            </label>
            <label>
              Itens no histórico
              <input
                type="number"
                min={1}
                max={12}
                value={form.historySize}
                onChange={(e) => setForm({ ...form, historySize: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="settings-hint">
            No layout Programação 9:16, use a seção <strong>Mídia / programação</strong> logo abaixo
            para escolher o display da TV Corporativa exibido na coluna esquerda.
          </p>
        </section>

        <section>
          <h2>TV Corporativa / programação</h2>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={form.mediaEnabled}
              onChange={(e) => setForm({ ...form, mediaEnabled: e.target.checked })}
            />
            Habilitar mídia / coluna de programação
          </label>
          <TvDisplayPicker
            selectedUrl={form.mediaItems.find((item) => item.type === 'link')?.src}
            onSelect={(display, playerUrl) => {
              setForm((previous) => {
                const mediaItems = previous.mediaItems.filter((item) => item.type !== 'link')
                if (display) {
                  mediaItems.unshift({
                    id: `tv-display-${display.id}`,
                    type: 'link',
                    src: playerUrl,
                    label: display.displayName,
                  })
                }
                return {
                  ...previous,
                  mediaEnabled: Boolean(display) || previous.mediaEnabled,
                  mediaItems,
                }
              })
            }}
          />
          <h3>Imagens e vídeos adicionais</h3>
          <div className="settings-media-add">
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
              placeholder="URL direta da imagem ou do vídeo"
              value={newMedia.src}
              onChange={(e) => setNewMedia({ ...newMedia, src: e.target.value })}
            />
            <input
              placeholder="Rótulo"
              value={newMedia.label}
              onChange={(e) => setNewMedia({ ...newMedia, label: e.target.value })}
            />
            <button type="button" onClick={addMedia}>
              Adicionar
            </button>
          </div>
          <p className="settings-hint">Escolha o display acima e clique em <strong>Salvar</strong>. O conteúdo aparece somente no painel.</p>
          <ul className="settings-media-list">
            {form.mediaItems.map((item) => (
              <li key={item.id}>
                <span>
                  [{item.type}] {item.label || item.src}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      mediaItems: prev.mediaItems.filter((m) => m.id !== item.id),
                    }))
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Voz e som</h2>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={form.speechEnabled}
              onChange={(e) => setForm({ ...form, speechEnabled: e.target.checked })}
            />
            Habilitar voz (pt-BR)
          </label>
          <div className="settings-grid">
            <label>
              Volume ({form.speechVolume.toFixed(2)})
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.speechVolume}
                onChange={(e) => setForm({ ...form, speechVolume: Number(e.target.value) })}
              />
            </label>
            <label>
              Velocidade ({form.speechRate.toFixed(2)})
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={form.speechRate}
                onChange={(e) => setForm({ ...form, speechRate: Number(e.target.value) })}
              />
            </label>
            <label>
              Voz
              <select
                value={form.speechVoice || SPEECH_VOICE_AUTO_FEMALE}
                onChange={(e) => setForm({ ...form, speechVoice: e.target.value })}
              >
                {voiceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="settings-hint">
            A voz vem do navegador/Sistema (ex.: Microsoft Francisca ou Google pt-BR). Depois de
            escolher, clique em <strong>Salvar</strong>. No painel Sedetur/Semit a voz passa a
            gravar no servidor (não volta mais para automática sozinha).
          </p>
          <button type="button" className="settings-test-voice" onClick={() => void testSpeech()}>
            Testar voz
          </button>
        </section>

        <section>
          <h2>Widgets de apoio (clima e notícias)</h2>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={form.widgetsEnabled !== false}
              onChange={(e) => setForm({ ...form, widgetsEnabled: e.target.checked })}
            />
            Mostrar clima e letreiro na área institucional (quando não houver mídia)
          </label>
          <label>
            Cidade para previsão do tempo
            <input
              value={form.weatherCity || ''}
              onChange={(e) => setForm({ ...form, weatherCity: e.target.value })}
              placeholder="Garça"
            />
          </label>
          <label>
            URL do feed RSS (letreiro / ticker)
            <input
              value={form.rssFeedUrl || ''}
              onChange={(e) => setForm({ ...form, rssFeedUrl: e.target.value })}
              placeholder="https://g1.globo.com/rss/g1/"
            />
          </label>
        </section>

        <section>
          <h2>PIN administrativo local</h2>
          <label>
            Novo PIN (opcional)
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Defina ou altere o PIN local"
              autoComplete="new-password"
            />
          </label>
        </section>

        {status ? <p className="settings-status">{status}</p> : null}

        <div className="settings-actions">
          <button type="submit">Salvar</button>
          <Link to="/">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
