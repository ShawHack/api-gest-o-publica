import { useEffect, useMemo, useState } from 'react'
import {
  FilePlus2,
  RefreshCw,
  Trash2,
  Users,
  Download,
  Calendar,
  MapPin,
  ExternalLink,
  Copy,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sparkles,
  Search,
  SlidersHorizontal,
  Palette,
  FileText,
  ListPlus,
} from 'lucide-react'
import {
  createForm,
  deleteForm,
  getStatistics,
  listForms,
  listInscriptions,
  updateForm,
  duplicateForm,
  publishForm,
  archiveForm,
  getFormDashboard,
} from '../../../services/formsGarcaService'
import styles from './FormsGarcaPortal.module.css'

const EMPTY_FORM = {
  titulo: '',
  subtitulo: '',
  descricao: '',
  tipoEvento: 'presencial',
  dataEvento: '',
  dataFim: '',
  inicioInscricoes: '',
  fimInscricoes: '',
  limiteInscricoes: '',
  inscricoesAbertas: true,
  permitirMultiplasInscricoes: false,
  mensagemConfirmacao: '',
  orientacoesInscricao: '',
  local: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: 'Garça',
  estado: 'SP',
  cep: '',
  linkOnline: '',
  tema: 'padrao',
  corPrimaria: '#1e3a8a',
  logoUrl: '',
  bannerUrl: '',
  organizadorNome: '',
  organizadorDescricao: '',
  organizadorEmail: '',
  organizadorTelefone: '',
  status: 'aberto',
  campos: [],
}

const FIELD_TYPES = [
  ['text', 'Texto curto'],
  ['textarea', 'Texto longo'],
  ['number', 'Número'],
  ['cpf', 'CPF'],
  ['email', 'E-mail'],
  ['phone', 'Telefone / WhatsApp'],
  ['date', 'Data'],
  ['select', 'Seleção única (dropdown)'],
  ['checkbox', 'Caixa de seleção'],
  ['file', 'Upload de arquivo'],
  ['declaracao', 'Declaração / Aceite'],
]

const STATUS_LABELS = {
  rascunho: 'Rascunho',
  aberto: 'Inscrições abertas',
  publicado: 'Publicado',
  emAndamento: 'Em andamento',
  concluido: 'Concluído',
  encerrado: 'Encerrado',
  arquivado: 'Arquivado',
}

function localDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return String(iso).slice(0, 10)
  }
}

function errorOf(err) {
  return err?.response?.data?.message || err?.message || 'Ocorreu um erro na operação.'
}

export default function FormsGarcaPortal() {
  const [tab, setTab] = useState('events') // 'events' | 'dashboard' | 'editor' | 'responses'
  const [forms, setForms] = useState([])
  const [statistics, setStatistics] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Contexto de seleção
  const [activeForm, setActiveForm] = useState(null)
  const [inscriptions, setInscriptions] = useState([])
  const [dashboardData, setDashboardData] = useState(null)

  // Filtros de Meus Eventos
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [formsRes, statsRes] = await Promise.all([
        listForms(statusFilter !== 'todos' ? { status: statusFilter, q: searchQuery } : { q: searchQuery }),
        getStatistics(),
      ])
      setForms(formsRes?.forms || [])
      setStatistics(statsRes || {})
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  function handleSearchSubmit(e) {
    if (e) e.preventDefault()
    loadData()
  }

  // Ações de Evento
  async function openDashboard(form) {
    setActiveForm(form)
    setLoading(true)
    setError('')
    try {
      const data = await getFormDashboard(form._id)
      setDashboardData(data)
      setTab('dashboard')
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setActiveForm(EMPTY_FORM)
    setTab('editor')
  }

  function startEdit(form) {
    setActiveForm({
      ...form,
      dataEvento: form.dataEvento ? String(form.dataEvento).slice(0, 10) : '',
      dataFim: form.dataFim ? String(form.dataFim).slice(0, 10) : '',
      inicioInscricoes: form.inicioInscricoes ? String(form.inicioInscricoes).slice(0, 10) : '',
      fimInscricoes: form.fimInscricoes ? String(form.fimInscricoes).slice(0, 10) : '',
      limiteInscricoes: form.limiteInscricoes ?? '',
      campos: form.campos || [],
    })
    setTab('editor')
  }

  async function openResponses(form) {
    setActiveForm(form)
    setLoading(true)
    setError('')
    try {
      const res = await listInscriptions(form._id)
      setInscriptions(res?.inscriptions || [])
      setTab('responses')
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDuplicate(form) {
    if (!window.confirm(`Deseja duplicar o evento "${form.titulo}" como um novo rascunho?`)) return
    setLoading(true)
    try {
      await duplicateForm(form._id)
      setNotice('Evento duplicado com sucesso como rascunho.')
      await loadData()
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish(form) {
    if (!window.confirm(`Deseja publicar o evento "${form.titulo}" e abrir para inscrições?`)) return
    setLoading(true)
    try {
      await publishForm(form._id)
      setNotice('Evento publicado com sucesso!')
      await loadData()
      if (tab === 'dashboard' && activeForm?._id === form._id) {
        await openDashboard(form)
      }
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleArchive(form) {
    if (!window.confirm(`Deseja arquivar o evento "${form.titulo}"? Ele deixará de receber novas inscrições públicas.`)) return
    setLoading(true)
    try {
      await archiveForm(form._id)
      setNotice('Evento arquivado com sucesso.')
      await loadData()
      if (tab === 'dashboard' && activeForm?._id === form._id) {
        await openDashboard(form)
      }
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(form) {
    if (!window.confirm(`Atenção: deseja realmente excluir o evento "${form.titulo}" e todas as suas inscrições?`)) return
    setLoading(true)
    try {
      await deleteForm(form._id)
      setNotice('Evento excluído com sucesso.')
      setTab('events')
      await loadData()
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>SEMIT · Gestão Pública Municipal</span>
          <h1>Forms Garça</h1>
          <p>Plataforma oficial para gestão de eventos, conferências, capacitações e processos de inscrição do Município.</p>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Navegação do módulo">
        <button
          type="button"
          className={tab === 'events' ? styles.activeTab : ''}
          onClick={() => setTab('events')}
        >
          <Layers size={17} /> Meus Eventos
        </button>

        {activeForm?._id && (
          <button
            type="button"
            className={tab === 'dashboard' ? styles.activeTab : ''}
            onClick={() => openDashboard(activeForm)}
          >
            <SlidersHorizontal size={17} /> Painel do Evento
          </button>
        )}

        {tab === 'editor' && (
          <button type="button" className={styles.activeTab}>
            <Settings size={17} /> {activeForm?._id ? 'Configuração do Evento' : 'Novo Evento'}
          </button>
        )}

        {tab === 'responses' && (
          <button type="button" className={styles.activeTab}>
            <Users size={17} /> Inscrições ({inscriptions.length})
          </button>
        )}
      </nav>

      <main className={styles.content}>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {notice && <div className={styles.success} role="status">{notice}</div>}

        {/* 1. MEUS EVENTOS */}
        {tab === 'events' && (
          <EventsListPage
            forms={forms}
            statistics={statistics}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSearch={handleSearchSubmit}
            onRefresh={loadData}
            onCreate={startCreate}
            onEdit={startEdit}
            onDashboard={openDashboard}
            onResponses={openResponses}
            onDuplicate={handleDuplicate}
            onPublish={handlePublish}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        )}

        {/* 2. PAINEL DO EVENTO (DASHBOARD) */}
        {tab === 'dashboard' && dashboardData && (
          <EventDashboardPage
            data={dashboardData}
            onBack={() => setTab('events')}
            onEdit={() => startEdit(dashboardData.event)}
            onResponses={() => openResponses(dashboardData.event)}
            onPublish={() => handlePublish(dashboardData.event)}
            onArchive={() => handleArchive(dashboardData.event)}
          />
        )}

        {/* 3. CONFIGURAÇÃO EM ETAPAS (EDITOR) */}
        {tab === 'editor' && (
          <EventSettingsPage
            initial={activeForm || EMPTY_FORM}
            onCancel={() => setTab('events')}
            onSaved={async () => {
              setNotice('Formulário salvo com sucesso.')
              setTab('events')
              await loadData()
            }}
            setError={setError}
          />
        )}

        {/* 4. INSCRIÇÕES E RESPOSTAS */}
        {tab === 'responses' && (
          <ResponsesPage
            form={activeForm}
            items={inscriptions}
            loading={loading}
            onBack={() => setTab('events')}
          />
        )}
      </main>
    </div>
  )
}

/* =========================================================================
   COMPONENTE: MEUS EVENTOS (LISTA DE EVENTOS)
   ========================================================================= */
function EventsListPage({
  forms,
  statistics,
  loading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onSearch,
  onRefresh,
  onCreate,
  onEdit,
  onDashboard,
  onResponses,
  onDuplicate,
  onPublish,
  onArchive,
  onDelete,
}) {
  const cards = [
    ['total', 'Total de eventos'],
    ['aberto', 'Inscrições abertas'],
    ['rascunho', 'Em rascunho'],
    ['concluido', 'Encerrados'],
  ]

  const statusOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'aberto', label: 'Abertos' },
    { value: 'rascunho', label: 'Rascunhos' },
    { value: 'emAndamento', label: 'Em andamento' },
    { value: 'concluido', label: 'Concluídos' },
    { value: 'arquivado', label: 'Arquivados' },
  ]

  return (
    <>
      <section className={styles.stats}>
        {cards.map(([key, label]) => (
          <article key={key}>
            <strong>{statistics[key] || 0}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <div className={styles.filtersBar}>
        <form className={styles.searchBox} onSubmit={onSearch}>
          <Search size={18} color="#64748b" />
          <input
            type="search"
            placeholder="Buscar por título ou local..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className={styles.statusPills}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.pill} ${statusFilter === opt.value ? styles.activePill : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.heading}>
        <div>
          <h2>Eventos e Processos de Inscrição</h2>
          <p>Gerencie eventos municipais, configure formulários e acompanhe participantes.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onRefresh}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button type="button" className={styles.primary} onClick={onCreate}>
            <FilePlus2 size={16} /> Novo
          </button>
        </div>
      </div>

      {loading ? (
        <p>Carregando eventos…</p>
      ) : !forms.length ? (
        <div className={styles.empty}>
          <p>Nenhum evento encontrado.</p>
          <button type="button" className={styles.primary} style={{ marginTop: '12px' }} onClick={onCreate}>
            Criar primeiro evento
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {forms.map((form) => {
            const statusKey = form.status || 'rascunho'
            const spotsLabel = form.limiteInscricoes
              ? `${form.vagasOcupadas || 0} / ${form.limiteInscricoes} vagas`
              : 'Vagas ilimitadas'

            return (
              <article className={styles.card} key={form._id}>
                <div className={styles.cardMain}>
                  <div className={styles.cardHeader}>
                    <span className={`${styles.badge} ${styles[statusKey] || styles.rascunho}`}>
                      {STATUS_LABELS[statusKey] || statusKey}
                    </span>
                    {form.tipoEvento && (
                      <span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569' }}>
                        {form.tipoEvento.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3>{form.titulo}</h3>
                  {form.subtitulo && <p style={{ fontWeight: 600, color: '#334155' }}>{form.subtitulo}</p>}
                  <p>{form.descricao || 'Sem descrição informada.'}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaItem}>
                      <Calendar size={15} /> Evento: {localDate(form.dataEvento)}
                    </span>
                    {form.local && (
                      <span className={styles.cardMetaItem}>
                        <MapPin size={15} /> {form.local}
                      </span>
                    )}
                    <span className={styles.cardMetaItem}>
                      <Users size={15} /> {form.totalInscritos || 0} inscritos ({spotsLabel})
                    </span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button type="button" className={styles.primary} onClick={() => onDashboard(form)}>
                    Painel
                  </button>
                  <button type="button" className={styles.secondary} onClick={() => onResponses(form)}>
                    <Users size={15} /> Inscrições
                  </button>
                  <button type="button" className={styles.outlineBtn} onClick={() => onEdit(form)}>
                    <Settings size={15} /> Configurar
                  </button>
                  {form.slug && (
                    <a
                      href={`/formularios/evento/${form.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.outlineBtn}
                      title="Ver página pública"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    type="button"
                    className={styles.outlineBtn}
                    title="Duplicar evento"
                    onClick={() => onDuplicate(form)}
                  >
                    <Copy size={15} />
                  </button>
                  {form.status === 'rascunho' && (
                    <button
                      type="button"
                      className={styles.successBtn}
                      title="Publicar evento"
                      onClick={() => onPublish(form)}
                    >
                      Publicar
                    </button>
                  )}
                  {form.status !== 'arquivado' && (
                    <button
                      type="button"
                      className={styles.outlineBtn}
                      title="Arquivar evento"
                      onClick={() => onArchive(form)}
                    >
                      Arquivar
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.danger}
                    title="Excluir evento"
                    onClick={() => onDelete(form)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

/* =========================================================================
   COMPONENTE: PAINEL DO EVENTO (DASHBOARD)
   ========================================================================= */
function EventDashboardPage({ data, onBack, onEdit, onResponses, onPublish, onArchive }) {
  const { event, indicators, alerts } = data
  const [copied, setCopied] = useState(false)

  const publicUrl = event.slug
    ? `${window.location.origin}/formularios/evento/${event.slug}`
    : ''

  function copyLink() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const occupancyRate = indicators.limite
    ? Math.min(100, Math.round((indicators.vagasOcupadas / indicators.limite) * 100))
    : null

  return (
    <div className={styles.dashboardGrid}>
      <p>
        <button type="button" className={styles.outlineBtn} onClick={onBack}>
          ← Voltar para Meus Eventos
        </button>
      </p>

      <section className={styles.eventBannerHero}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <span className={`${styles.badge} ${styles[event.status] || styles.rascunho}`}>
              {STATUS_LABELS[event.status] || event.status}
            </span>
            <h2>{event.titulo}</h2>
            {event.subtitulo && <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>{event.subtitulo}</p>}
            <p>
              Data: <strong>{localDate(event.dataEvento)}</strong> {event.local ? `· Local: ${event.local}` : ''}
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onEdit}>
              <Settings size={16} /> Configurações
            </button>
            <button type="button" className={styles.primary} onClick={onResponses}>
              <Users size={16} /> Ver Inscrições
            </button>
            {event.status === 'rascunho' && (
              <button type="button" className={styles.successBtn} onClick={onPublish}>
                <CheckCircle2 size={16} /> Publicar Evento
              </button>
            )}
            {event.status !== 'arquivado' && (
              <button type="button" className={styles.outlineBtn} onClick={onArchive}>
                Arquivar
              </button>
            )}
          </div>
        </div>

        {publicUrl && (
          <div className={styles.bannerUrlBadge}>
            <span>Link público: {publicUrl}</span>
            <button
              type="button"
              className={styles.outlineBtn}
              style={{ padding: '3px 8px', fontSize: '.78rem' }}
              onClick={copyLink}
            >
              <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.outlineBtn}
              style={{ padding: '3px 8px', fontSize: '.78rem' }}
            >
              <ExternalLink size={13} /> Abrir
            </a>
          </div>
        )}
      </section>

      {alerts && alerts.length > 0 && (
        <div className={styles.alertBox}>
          <h4>Avisos e Pendências de Configuração</h4>
          <ul>
            {alerts.map((al, idx) => (
              <li key={idx}>{al}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.indicatorsGrid}>
        <article className={styles.indicatorCard}>
          <strong>{indicators.totalInscritos}</strong>
          <span>Total de Inscritos</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong style={{ color: '#16a34a' }}>{indicators.confirmados}</strong>
          <span>Inscrições Confirmadas</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong style={{ color: '#d97706' }}>{indicators.pendentes}</strong>
          <span>Pendentes</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong style={{ color: '#dc2626' }}>{indicators.cancelados}</strong>
          <span>Canceladas</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong>{indicators.limite ? indicators.limite : 'Ilimitado'}</strong>
          <span>Capacidade de Vagas</span>
          {occupancyRate !== null && (
            <div className={styles.progressBar} title={`${occupancyRate}% ocupado`}>
              <div className={styles.progressFill} style={{ width: `${occupancyRate}%` }} />
            </div>
          )}
        </article>

        <article className={styles.indicatorCard}>
          <strong>{indicators.vagasRestantes !== null ? indicators.vagasRestantes : 'Livre'}</strong>
          <span>Vagas Restantes</span>
        </article>
      </div>
    </div>
  )
}

/* =========================================================================
   COMPONENTE: CONFIGURAÇÃO DO EVENTO (5 SEÇÕES)
   ========================================================================= */
function EventSettingsPage({ initial, onCancel, onSaved, setError }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(form._id)

  const update = ({ target }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value
    setForm((curr) => ({ ...curr, [target.name]: value }))
  }

  const addField = () => {
    setForm((curr) => ({
      ...curr,
      campos: [
        ...curr.campos,
        {
          id: `campo_${Date.now()}`,
          fieldId: `campo_${Date.now()}`,
          label: '',
          type: 'text',
          required: false,
          placeholder: '',
          helpText: '',
          options: [],
        },
      ],
    }))
  }

  const updateField = (index, patch) => {
    setForm((curr) => ({
      ...curr,
      campos: curr.campos.map((f, pos) => (pos === index ? { ...f, ...patch } : f)),
    }))
  }

  const removeField = (index) => {
    setForm((curr) => ({
      ...curr,
      campos: curr.campos.filter((_, pos) => pos !== index),
    }))
  }

  async function submit(e) {
    if (e) e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        campos: form.campos.map((f) => ({
          ...f,
          options: ['select', 'radio', 'checkbox'].includes(f.type) ? f.options : [],
        })),
      }
      if (isEdit) {
        await updateForm(form._id, payload)
      } else {
        await createForm(payload)
      }
      await onSaved()
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.editor} onSubmit={submit}>
      <div className={styles.heading}>
        <div>
          <h2>{isEdit ? 'Editar formulário' : 'Novo formulário'}</h2>
          <p>Defina as informações gerais, regras de inscrição e os campos que serão respondidos.</p>
        </div>
      </div>

      {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', color: '#1e3a8a' }}>
        1. Informações Gerais
      </h3>
      <div className={styles.grid}>
        <label>
          Título *
          <input name="titulo" value={form.titulo} onChange={update} required placeholder="Nome do evento ou processo" />
        </label>
        <label>
          Data do evento *
          <input name="dataEvento" type="date" value={form.dataEvento} onChange={update} required />
        </label>
      </div>

      <div className={styles.grid3}>
        <label>
          Tipo de Evento
          <select name="tipoEvento" value={form.tipoEvento || 'presencial'} onChange={update}>
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
            <option value="hibrido">Híbrido</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" value={form.status || 'aberto'} onChange={update}>
            <option value="aberto">Aberto</option>
            <option value="rascunho">Rascunho</option>
            <option value="emAndamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </label>
        <label>
          ID da solicitação 1Doc
          <input name="idSolicitacao1Doc" value={form.idSolicitacao1Doc || ''} onChange={update} placeholder="Opcional" />
        </label>
      </div>

      <label>
        Descrição
        <textarea
          name="descricao"
          value={form.descricao || ''}
          onChange={update}
          placeholder="Descreva os objetivos, regulamento ou programação..."
        />
      </label>

      <div className={styles.grid3}>
        <label>
          Local
          <input name="local" value={form.local || ''} onChange={update} placeholder="Ex: Teatro Municipal" />
        </label>
        <label>
          Endereço
          <input name="endereco" value={form.endereco || ''} onChange={update} placeholder="Rua / Avenida" />
        </label>
        <label>
          Organizador responsável
          <input name="organizadorNome" value={form.organizadorNome || ''} onChange={update} placeholder="Secretaria / Comissão" />
        </label>
      </div>

      {/* SEÇÃO 2: INSCRIÇÕES E VAGAS */}
      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', color: '#1e3a8a', marginTop: '16px' }}>
        2. Inscrições e Vagas
      </h3>
      <div className={styles.grid}>
        <label>
          Limite de vagas (vazio para ilimitado)
          <input
            name="limiteInscricoes"
            type="number"
            min="1"
            value={form.limiteInscricoes || ''}
            onChange={update}
            placeholder="Ex: 50"
          />
        </label>
        <label>
          Período de Inscrição (Término)
          <input name="fimInscricoes" type="date" value={form.fimInscricoes || ''} onChange={update} />
        </label>
      </div>

      {/* SEÇÃO 3: CAMPOS DO FORMULÁRIO */}
      <div className={styles.heading} style={{ marginTop: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
        <h3 style={{ color: '#1e3a8a', margin: 0 }}>Campos do formulário</h3>
        <button className={styles.secondary} type="button" onClick={addField}>
          + Adicionar campo
        </button>
      </div>

      <div className={styles.fields}>
        {form.campos.map((field, index) => (
          <div className={styles.fieldRow} key={field.id || index}>
            <label>
              Rótulo *
              <input
                value={field.label}
                onChange={({ target }) => updateField(index, { label: target.value })}
                required
                placeholder="Ex: CPF, E-mail, Cargo..."
              />
            </label>
            <label>
              Tipo
              <select
                value={field.type}
                onChange={({ target }) => updateField(index, { type: target.value })}
              >
                {FIELD_TYPES.map(([val, lab]) => (
                  <option key={val} value={val}>{lab}</option>
                ))}
              </select>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={Boolean(field.required)}
                onChange={({ target }) => updateField(index, { required: target.checked })}
              />
              Obrigatório
            </label>
            {['select', 'radio', 'checkbox'].includes(field.type) && (
              <label className={styles.wide}>
                Opções (uma por linha)
                <textarea
                  value={(field.options || []).join('\n')}
                  onChange={({ target }) =>
                    updateField(index, {
                      options: target.value.split('\n').map((opt) => opt.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                />
              </label>
            )}
            <button
              className={styles.iconDanger}
              type="button"
              aria-label={`Remover campo ${field.label || index + 1}`}
              onClick={() => removeField(index)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* SEÇÃO 4: PERSONALIZAÇÃO / WHITE LABEL */}
      <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', color: '#1e3a8a', marginTop: '16px' }}>
        4. Personalização / Identidade Visual
      </h3>
      <div className={styles.grid}>
        <label>
          Tema Visual
          <select name="tema" value={form.tema || 'padrao'} onChange={update}>
            <option value="padrao">Padrão SEMIT (Azul Oficial)</option>
            <option value="verde">Sustentabilidade (Verde)</option>
            <option value="coral">Cultura & Eventos (Coral)</option>
            <option value="elegante">Executivo (Escuro)</option>
          </select>
        </label>
        <label>
          Cor Primária (Hex)
          <input name="corPrimaria" value={form.corPrimaria || '#1e3a8a'} onChange={update} />
        </label>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className={styles.actions} style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
        <button className={styles.primary} disabled={saving} type="submit">
          {saving ? 'Salvando…' : 'Salvar formulário'}
        </button>
        <button className={styles.secondary} type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/* =========================================================================
   COMPONENTE: RESPOSTAS / INSCRIÇÕES
   ========================================================================= */
function ResponsesPage({ form, items, loading, onBack }) {
  const fields = useMemo(() => form?.campos || [], [form])

  return (
    <>
      <p>
        <button type="button" className={styles.outlineBtn} onClick={onBack}>
          ← Voltar para Meus Eventos
        </button>
      </p>

      <div className={styles.heading}>
        <div>
          <h2>Inscrições — {form?.titulo}</h2>
          <p>{items.length} inscrição(ões) registrada(s).</p>
        </div>
        {Boolean(items.length) && (
          <button className={styles.secondary} type="button" onClick={() => exportCsv(form, fields, items)}>
            <Download size={17} /> Exportar CSV
          </button>
        )}
      </div>

      {loading ? (
        <p>Carregando inscrições…</p>
      ) : !items.length ? (
        <div className={styles.empty}>Nenhuma inscrição cadastrada neste evento ainda.</div>
      ) : (
        <div className={styles.responseTable}>
          <table>
            <thead>
              <tr>
                <th>Inscrito</th>
                <th>Voucher</th>
                <th>Status</th>
                {fields.map((f) => (
                  <th key={f.fieldId}>{f.label}</th>
                ))}
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td><strong>{item.userName}</strong></td>
                  <td><code>{item.voucherCode}</code></td>
                  <td>
                    <span className={`${styles.badge} ${styles[item.status] || styles.aberto}`}>
                      {item.status || 'confirmada'}
                    </span>
                  </td>
                  {fields.map((f) => (
                    <td key={f.fieldId}>{formatAnswer(item.formData?.[f.fieldId])}</td>
                  ))}
                  <td>{localDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function formatAnswer(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value == null || value === '' ? '—' : String(value)
}

function exportCsv(form, fields, items) {
  const quote = (val) => `"${String(val ?? '').replaceAll('"', '""')}"`
  const header = ['Inscrito', 'Voucher', 'Status', ...fields.map((f) => f.label), 'Data']
  const rows = items.map((item) => [
    item.userName,
    item.voucherCode,
    item.status || 'confirmada',
    ...fields.map((f) => formatAnswer(item.formData?.[f.fieldId])),
    localDate(item.createdAt),
  ])
  const csv = `\uFEFF${[header, ...rows].map((r) => r.map(quote).join(';')).join('\n')}`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `inscricoes-${String(form?.titulo || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
