import React, { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Users,
  XCircle,
  Clock,
  Printer,
  Eye,
  ArrowUp,
  ArrowDown,
  Palette,
  FileText,
  ListPlus,
  UploadCloud,
  AlertCircle
} from 'lucide-react'
import {
  createForm,
  deleteForm,
  getFormDashboard,
  getStatistics,
  listForms,
  listInscriptions,
  updateForm,
  duplicateForm,
  publishForm,
  archiveForm,
  updateInscriptionStatus,
  uploadFile,
} from '../../../services/formsGarcaService'
import styles from './FormsGarcaPortal.module.css'

const EMPTY_FORM = {
  titulo: '',
  subtitulo: '',
  slug: '',
  descricao: '',
  dataEvento: '',
  dataFim: '',
  tipoEvento: 'presencial',
  inicioInscricoes: '',
  fimInscricoes: '',
  limiteInscricoes: '',
  inscricoesAbertas: true,
  permitirMultiplasInscricoes: false,
  mensagemConfirmacao: 'Sua inscrição foi confirmada com sucesso! Apresente o código do voucher no dia do evento.',
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
  organizadorNome: 'Prefeitura Municipal de Garça',
  organizadorDescricao: '',
  idSolicitacao1Doc: '',
  status: 'aberto',
  campos: [],
}

const FIELD_TYPES = [
  ['text', 'Texto curto'],
  ['textarea', 'Texto longo'],
  ['number', 'Número'],
  ['email', 'E-mail'],
  ['phone', 'Telefone / WhatsApp'],
  ['cpf', 'CPF'],
  ['date', 'Data'],
  ['select', 'Seleção única (dropdown)'],
  ['radio', 'Opção única (radio)'],
  ['checkbox', 'Caixa de seleção (múltipla)'],
  ['file', 'Envio de arquivo (upload)'],
  ['terms', 'Declaração / Aceite de termos'],
]

function errorOf(err) {
  return err?.response?.data?.message || err?.message || 'Falha ao processar solicitação.'
}

function localDate(date) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function FormsGarcaPortal() {
  const [tab, setTab] = useState('events') // 'events' | 'dashboard' | 'editor' | 'responses'
  const [forms, setForms] = useState([])
  const [statistics, setStatistics] = useState({ total: 0, aberto: 0, rascunho: 0, emAndamento: 0, concluido: 0, arquivado: 0 })
  const [inscriptions, setInscriptions] = useState([])
  const [activeForm, setActiveForm] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filtros da listagem
  const [statusFilter, setStatusFilter] = useState('todos')
  const [searchQuery, setSearchQuery] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const filterParams = {}
      if (statusFilter !== 'todos') filterParams.status = statusFilter
      if (searchQuery.trim()) filterParams.search = searchQuery.trim()

      const [formsRes, statsRes] = await Promise.all([
        listForms(filterParams),
        getStatistics(),
      ])
      setForms(formsRes.forms || [])
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

  function startCreate() {
    setActiveForm({
      ...EMPTY_FORM,
      dataEvento: new Date().toISOString().slice(0, 10),
      campos: [],
    })
    setTab('editor')
  }

  function startEdit(form) {
    setActiveForm({
      ...EMPTY_FORM,
      ...form,
      dataEvento: form.dataEvento ? String(form.dataEvento).slice(0, 10) : '',
      dataFim: form.dataFim ? String(form.dataFim).slice(0, 10) : '',
      inicioInscricoes: form.inicioInscricoes ? String(form.inicioInscricoes).slice(0, 10) : '',
      fimInscricoes: form.fimInscricoes ? String(form.fimInscricoes).slice(0, 10) : '',
      campos: (form.campos || []).map((c, i) => ({
        ...c,
        id: c.fieldId || `campo_${i}`,
      })),
    })
    setTab('editor')
  }

  async function openDashboard(form) {
    setLoading(true)
    setError('')
    try {
      const data = await getFormDashboard(form._id)
      setDashboardData(data)
      setActiveForm(data.event)
      setTab('dashboard')
    } catch (err) {
      setError(errorOf(err))
    } finally {
      setLoading(false)
    }
  }

  async function openResponses(form) {
    setActiveForm(form)
    setLoading(true)
    setError('')
    try {
      const res = await listInscriptions(form._id)
      setInscriptions(res.inscriptions || [])
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
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.badgeGov}>Plataforma de Eventos & Processos</span>
          <h1>Forms Garça</h1>
          <p>Gestão centralizada de formulários, eventos municipais e inscrições públicas.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.primary} onClick={startCreate}>
            <Plus size={18} /> Novo
          </button>
        </div>
      </header>

      {/* NAVEGAÇÃO SUPERIOR */}
      <nav className={styles.navTabs}>
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

        {/* 4. INSCRIÇÕES E GESTÃO DE PARTICIPANTES */}
        {tab === 'responses' && (
          <ResponsesPage
            form={activeForm}
            items={inscriptions}
            loading={loading}
            onBack={() => setTab('events')}
            onRefresh={() => openResponses(activeForm)}
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
  return (
    <>
      {/* BARRA DE FILTROS E BUSCA */}
      <div className={styles.filterBar}>
        <form onSubmit={onSearch} className={styles.searchForm}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar evento por título ou organizador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.secondary}>Buscar</button>
        </form>

        <div className={styles.statusFilters}>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'todos' ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter('todos')}
          >
            Todos ({statistics.total || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'aberto' ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter('aberto')}
          >
            Abertos ({statistics.aberto || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'rascunho' ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter('rascunho')}
          >
            Rascunhos ({statistics.rascunho || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'emAndamento' ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter('emAndamento')}
          >
            Em Andamento ({statistics.emAndamento || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'concluido' ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter('concluido')}
          >
            Concluídos ({statistics.concluido || 0})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'arquivado' ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter('arquivado')}
          >
            Arquivados ({statistics.arquivado || 0})
          </button>
        </div>

        <button type="button" className={styles.iconBtn} onClick={onRefresh} title="Atualizar lista">
          <RefreshCw size={17} />
        </button>
      </div>

      {/* GRID DE CARTÕES DE EVENTOS */}
      {loading ? (
        <div className={styles.loading}>Carregando eventos...</div>
      ) : forms.length === 0 ? (
        <div className={styles.emptyState}>
          <Layers size={48} className={styles.emptyIcon} />
          <h3>Nenhum evento encontrado</h3>
          <p>Não há eventos com os filtros selecionados ou ainda não há eventos criados.</p>
          <button type="button" className={styles.primary} onClick={onCreate}>
            <Plus size={18} /> Criar meu primeiro evento
          </button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {forms.map((form) => {
            const spotsLabel = form.limiteInscricoes
              ? `${form.vagasOcupadas || 0}/${form.limiteInscricoes} vagas`
              : 'Vagas livres'

            return (
              <article key={form._id} className={styles.eventCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.badgeWrapper}>
                    <span className={`${styles.badge} ${styles[form.status] || styles.aberto}`}>
                      {form.status || 'aberto'}
                    </span>
                    {form.publicado && (
                      <span className={styles.publicBadge}>
                        <CheckCircle2 size={13} /> Publicado
                      </span>
                    )}
                  </div>
                  <span className={styles.eventDate}>
                    <Calendar size={14} /> {localDate(form.dataEvento)}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{form.titulo}</h3>
                  {form.subtitulo && <p className={styles.cardSubtitle}>{form.subtitulo}</p>}

                  <div className={styles.cardMeta}>
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
      {/* CABEÇALHO DO PAINEL */}
      <div className={styles.dashboardHeader}>
        <div>
          <button type="button" className={styles.outlineBtn} onClick={onBack}>
            ← Voltar para Meus Eventos
          </button>
          <h2>{event.titulo}</h2>
          <p>
            Status: <strong>{event.status}</strong> | Publicação:{' '}
            <strong>{event.publicado ? 'Publicado' : 'Não publicado'}</strong> | Data do Evento:{' '}
            <strong>{localDate(event.dataEvento)}</strong>
          </p>
        </div>

        <div className={styles.dashboardActions}>
          <button type="button" className={styles.secondary} onClick={onEdit}>
            <Settings size={17} /> Editar Configurações
          </button>
          <button type="button" className={styles.primary} onClick={onResponses}>
            <Users size={17} /> Gerenciar Inscritos ({indicators.totalInscritos})
          </button>
          {event.status === 'rascunho' && (
            <button type="button" className={styles.successBtn} onClick={onPublish}>
              Publicar Evento
            </button>
          )}
          {event.status !== 'arquivado' && (
            <button type="button" className={styles.outlineBtn} onClick={onArchive}>
              Arquivar
            </button>
          )}
        </div>
      </div>

      {/* ALERTAS DE CONFIGURAÇÃO */}
      {alerts && alerts.length > 0 && (
        <div className={styles.alertsContainer}>
          {alerts.map((al, idx) => (
            <div key={idx} className={`${styles.alertBox} ${styles['alert_' + al.type]}`}>
              <span>{al.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* LINK PÚBLICO E DIVULGAÇÃO */}
      {publicUrl && (
        <div className={styles.publicLinkCard}>
          <div>
            <strong>Endereço da Página Pública:</strong>
            <p className={styles.linkText}>{publicUrl}</p>
          </div>
          <div className={styles.publicLinkActions}>
            <button type="button" className={styles.secondary} onClick={copyLink}>
              <Copy size={16} /> {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.outlineBtn}
            >
              <ExternalLink size={16} /> Abrir Página
            </a>
          </div>
        </div>
      )}

      {/* INDICADORES EM NÚMEROS */}
      <div className={styles.indicatorsRow}>
        <article className={styles.indicatorCard}>
          <strong>{indicators.totalInscritos}</strong>
          <span>Total de Inscritos</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong style={{ color: '#16a34a' }}>{indicators.confirmados}</strong>
          <span>Confirmados</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong style={{ color: '#d97706' }}>{indicators.pendentes}</strong>
          <span>Pendentes</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong style={{ color: '#dc2626' }}>{indicators.cancelados}</strong>
          <span>Cancelados</span>
        </article>

        <article className={styles.indicatorCard}>
          <strong>
            {indicators.limite ? `${indicators.vagasOcupadas} / ${indicators.limite}` : 'Ilimitado'}
          </strong>
          <span>Vagas Ocupadas</span>
          {occupancyRate !== null && (
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${occupancyRate}%` }} />
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
  const [currentStep, setCurrentStep] = useState('info') // 'info' | 'rules' | 'fields' | 'appearance' | 'publish'
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const isEdit = Boolean(form._id)

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setUploadError('')
    try {
      const res = await uploadFile(file)
      if (res?.fileLink) {
        setForm((curr) => ({ ...curr, logoUrl: res.fileLink }))
      }
    } catch (err) {
      setUploadError('Erro no upload do logotipo: ' + (err?.response?.data?.message || err.message))
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleUploadBanner = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    setUploadError('')
    try {
      const res = await uploadFile(file)
      if (res?.fileLink) {
        setForm((curr) => ({ ...curr, bannerUrl: res.fileLink }))
      }
    } catch (err) {
      setUploadError('Erro no upload do banner: ' + (err?.response?.data?.message || err.message))
    } finally {
      setUploadingBanner(false)
      e.target.value = ''
    }
  }

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

  const moveField = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= form.campos.length) return
    const newFields = [...form.campos]
    const temp = newFields[index]
    newFields[index] = newFields[targetIndex]
    newFields[targetIndex] = temp
    setForm((curr) => ({ ...curr, campos: newFields }))
  }

  const addOptionToField = (index, opt) => {
    if (!opt.trim()) return
    const field = form.campos[index]
    const options = Array.isArray(field.options) ? field.options : []
    updateField(index, { options: [...options, opt.trim()] })
  }

  const removeOptionFromField = (index, optIndex) => {
    const field = form.campos[index]
    const options = Array.isArray(field.options) ? field.options : []
    updateField(index, { options: options.filter((_, i) => i !== optIndex) })
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
          <p>Defina as informações gerais, regras de inscrição, campos e aparência.</p>
        </div>
        <div className={styles.stepTabs}>
          <button
            type="button"
            className={styles.stepTab}
            onClick={() => document.getElementById('sec-info')?.scrollIntoView({ behavior: 'smooth' })}
          >
            1. Informações
          </button>
          <button
            type="button"
            className={styles.stepTab}
            onClick={() => document.getElementById('sec-rules')?.scrollIntoView({ behavior: 'smooth' })}
          >
            2. Inscrições
          </button>
          <button
            type="button"
            className={styles.stepTab}
            onClick={() => document.getElementById('sec-fields')?.scrollIntoView({ behavior: 'smooth' })}
          >
            3. Campos ({form.campos.length})
          </button>
          <button
            type="button"
            className={styles.stepTab}
            onClick={() => document.getElementById('sec-appearance')?.scrollIntoView({ behavior: 'smooth' })}
          >
            4. Aparência
          </button>
          <button
            type="button"
            className={styles.stepTab}
            onClick={() => document.getElementById('sec-publish')?.scrollIntoView({ behavior: 'smooth' })}
          >
            5. Revisão
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
      <div className={styles.stepContent} id="sec-info">
        <h3 className={styles.sectionHeader}>1. Informações Gerais do Evento</h3>
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

          <div className={styles.grid}>
            <label>
              Complemento do nome / Tema secundário
              <input name="subtitulo" value={form.subtitulo || ''} onChange={update} placeholder="Ex: Edição 2026 / Vagas Remanescentes" />
            </label>
            <label>
              Data de Encerramento (opcional)
              <input name="dataFim" type="date" value={form.dataFim || ''} onChange={update} />
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
            Descrição Detalhada
            <textarea
              name="descricao"
              value={form.descricao || ''}
              onChange={update}
              rows={4}
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
              Bairro
              <input name="bairro" value={form.bairro || ''} onChange={update} placeholder="Bairro" />
            </label>
          </div>

          <div className={styles.grid}>
            <label>
              Organizador responsável
              <input name="organizadorNome" value={form.organizadorNome || ''} onChange={update} placeholder="Secretaria / Comissão" />
            </label>
            <label>
              Link online (quando aplicável)
              <input name="linkOnline" value={form.linkOnline || ''} onChange={update} placeholder="https://meet.google.com/..." />
            </label>
          </div>
        </div>

      {/* SEÇÃO 2: INSCRIÇÕES E VAGAS */}
      <div className={styles.stepContent} id="sec-rules">
        <h3 className={styles.sectionHeader}>2. Inscrições e Vagas</h3>
          <div className={styles.grid}>
            <label>
              Início das Inscrições (opcional)
              <input name="inicioInscricoes" type="date" value={form.inicioInscricoes || ''} onChange={update} />
            </label>
            <label>
              Término das Inscrições (opcional)
              <input name="fimInscricoes" type="date" value={form.fimInscricoes || ''} onChange={update} />
            </label>
          </div>

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
            <label className={styles.check} style={{ marginTop: '28px' }}>
              <input
                name="inscricoesAbertas"
                type="checkbox"
                checked={Boolean(form.inscricoesAbertas)}
                onChange={update}
              />
              Inscrições Abertas (recebendo respostas)
            </label>
          </div>

          <label>
            Mensagem de Confirmação de Sucesso
            <input
              name="mensagemConfirmacao"
              value={form.mensagemConfirmacao || ''}
              onChange={update}
              placeholder="Instruções exibidas no comprovante ao participante"
            />
          </label>

          <label>
            Orientações ao Participante
            <textarea
              name="orientacoesInscricao"
              value={form.orientacoesInscricao || ''}
              onChange={update}
              rows={3}
              placeholder="Ex: Trazer documento com foto, chegar com 15 minutos de antecedência..."
            />
          </label>
        </div>

      {/* SEÇÃO 3: CAMPOS DO FORMULÁRIO */}
      <div className={styles.stepContent} id="sec-fields">
          <div className={styles.heading} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h3 style={{ color: '#1e3a8a', margin: 0 }}>Campos do formulário</h3>
            <button className={styles.secondary} type="button" onClick={addField}>
              + Adicionar campo
            </button>
          </div>

          <div className={styles.fields}>
            {form.campos.length === 0 ? (
              <div className={styles.empty}>Nenhum campo adicional configurado. O formulário solicitará apenas Nome e E-mail.</div>
            ) : (
              form.campos.map((field, index) => (
                <div className={styles.fieldRow} key={field.id || index}>
                  <div className={styles.fieldOrderControls}>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      disabled={index === 0}
                      onClick={() => moveField(index, -1)}
                      title="Mover para cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      disabled={index === form.campos.length - 1}
                      onClick={() => moveField(index, 1)}
                      title="Mover para baixo"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <label>
                    Rótulo *
                    <input
                      value={field.label}
                      onChange={({ target }) => updateField(index, { label: target.value })}
                      required
                      placeholder="Ex: CPF, Telefone, Grau de Escolaridade..."
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
                    <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        Opções da lista:
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <input
                          id={`new_opt_${index}`}
                          placeholder="Digite uma opção e tecle Adicionar..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addOptionToField(index, e.target.value)
                              e.target.value = ''
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => {
                            const inp = document.getElementById(`new_opt_${index}`)
                            if (inp && inp.value) {
                              addOptionToField(index, inp.value)
                              inp.value = ''
                            }
                          }}
                        >
                          + Adicionar Opção
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {(field.options || []).map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            style={{
                              background: '#e2e8f0',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOptionFromField(index, optIdx)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className={styles.danger}
                    type="button"
                    onClick={() => removeField(index)}
                    title="Excluir campo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      {/* SEÇÃO 4: APARÊNCIA & WHITE LABEL */}
      <div className={styles.stepContent} id="sec-appearance">
        <h3 className={styles.sectionHeader}>4. Aparência & White Label</h3>
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
              Cor Primária (Hexadecimal)
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.corPrimaria || '#1e3a8a'}
                  onChange={({ target }) => setForm((curr) => ({ ...curr, corPrimaria: target.value }))}
                  style={{ width: '42px', height: '42px', padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <input name="corPrimaria" value={form.corPrimaria || '#1e3a8a'} onChange={update} />
              </div>
            </label>
          </div>

          <div className={styles.grid}>
            {/* LOGOTIPO */}
            <div className={styles.mediaUploadGroup}>
              <span className={styles.mediaLabel}>Logotipo do Evento / Secretaria</span>
              <div className={styles.mediaInputRow}>
                <input
                  name="logoUrl"
                  value={form.logoUrl || ''}
                  onChange={update}
                  placeholder="https://.../logo.png ou faça upload"
                  className={styles.mediaInput}
                />
                <label className={styles.uploadBtn} title="Fazer upload de imagem do computador">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    disabled={uploadingLogo}
                    style={{ display: 'none' }}
                  />
                  <UploadCloud size={16} />
                  <span>{uploadingLogo ? 'Enviando…' : 'Upload'}</span>
                </label>
              </div>
              <small className={styles.mediaHelp}>
                PNG, JPG, SVG ou WebP (recomendado fundo transparente ou claro)
              </small>
              {form.logoUrl && (
                <div className={styles.mediaPreview}>
                  <div className={styles.logoThumb}>
                    <img src={form.logoUrl} alt="Preview do Logo" onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                  <span className={styles.previewName}>{form.logoUrl.split('/').pop()}</span>
                  <button
                    type="button"
                    className={styles.clearMediaBtn}
                    onClick={() => setForm((curr) => ({ ...curr, logoUrl: '' }))}
                    title="Remover logotipo"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* BANNER */}
            <div className={styles.mediaUploadGroup}>
              <span className={styles.mediaLabel}>Banner de Topo do Evento</span>
              <div className={styles.mediaInputRow}>
                <input
                  name="bannerUrl"
                  value={form.bannerUrl || ''}
                  onChange={update}
                  placeholder="https://.../banner.jpg ou faça upload"
                  className={styles.mediaInput}
                />
                <label className={styles.uploadBtn} title="Fazer upload de banner do computador">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadBanner}
                    disabled={uploadingBanner}
                    style={{ display: 'none' }}
                  />
                  <UploadCloud size={16} />
                  <span>{uploadingBanner ? 'Enviando…' : 'Upload'}</span>
                </label>
              </div>
              <small className={styles.mediaHelp}>
                Dimensão recomendada: 1200x300 ou 1600x400 (JPG, PNG ou WebP)
              </small>
              {form.bannerUrl && (
                <div className={styles.mediaPreview}>
                  <div className={styles.bannerThumb}>
                    <img src={form.bannerUrl} alt="Preview do Banner" onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                  <span className={styles.previewName}>{form.bannerUrl.split('/').pop()}</span>
                  <button
                    type="button"
                    className={styles.clearMediaBtn}
                    onClick={() => setForm((curr) => ({ ...curr, bannerUrl: '' }))}
                    title="Remover banner"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {uploadError && (
            <div className={styles.errorBanner} style={{ marginTop: '8px' }}>
              <AlertCircle size={16} />
              <span>{uploadError}</span>
            </div>
          )}

          <label>
            Identificador Amigável (Slug da URL)
            <input
              name="slug"
              value={form.slug || ''}
              onChange={update}
              placeholder="ex: feira-municipal-de-garca-2026"
            />
            <small style={{ color: '#64748b' }}>
              Endereço público: {window.location.origin}/formularios/evento/{form.slug || 'seu-slug'}
            </small>
          </label>
        </div>

      {/* SEÇÃO 5: REVISÃO E PUBLICAÇÃO */}
      <div className={styles.stepContent} id="sec-publish">
        <h3 className={styles.sectionHeader}>5. Revisão e Publicação</h3>
          <div className={styles.checklistCard}>
            <div className={styles.checklistItem}>
              <CheckCircle2 size={18} color={form.titulo ? '#16a34a' : '#cbd5e1'} />
              <span>Título do evento definido: <strong>{form.titulo || 'Pendente'}</strong></span>
            </div>
            <div className={styles.checklistItem}>
              <CheckCircle2 size={18} color={form.dataEvento ? '#16a34a' : '#cbd5e1'} />
              <span>Data do evento definida: <strong>{form.dataEvento || 'Pendente'}</strong></span>
            </div>
            <div className={styles.checklistItem}>
              <CheckCircle2 size={18} color={form.campos.length > 0 ? '#16a34a' : '#cbd5e1'} />
              <span>Campos customizados: <strong>{form.campos.length} campo(s) configurado(s)</strong></span>
            </div>
            <div className={styles.checklistItem}>
              <CheckCircle2 size={18} color={form.publicado ? '#16a34a' : '#d97706'} />
              <span>Situação: <strong>{form.publicado ? 'Publicado na web' : 'Rascunho'}</strong></span>
            </div>
          </div>
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
   COMPONENTE: RESPOSTAS / GESTÃO DE PARTICIPANTES
   ========================================================================= */
function ResponsesPage({ form, items, loading, onBack, onRefresh }) {
  const fields = useMemo(() => form?.campos || [], [form])
  const [filterStatus, setFilterStatus] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== 'todos' && item.status !== filterStatus) return false
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchName = String(item.userName || '').toLowerCase().includes(term)
        const matchEmail = String(item.userEmail || '').toLowerCase().includes(term)
        const matchVoucher = String(item.voucherCode || '').toLowerCase().includes(term)
        if (!matchName && !matchEmail && !matchVoucher) return false
      }
      return true
    })
  }, [items, filterStatus, searchTerm])

  const handleStatusChange = async (item, newStatus) => {
    if (!window.confirm(`Deseja alterar o status da inscrição de "${item.userName}" para ${newStatus}?`)) return
    setUpdatingId(item._id)
    try {
      await updateInscriptionStatus(item._id, newStatus)
      if (onRefresh) onRefresh()
    } catch (err) {
      alert(errorOf(err))
    } finally {
      setUpdatingId(null)
    }
  }

  const printAttendanceList = () => {
    window.print()
  }

  return (
    <>
      <div className={styles.noPrint}>
        <p>
          <button type="button" className={styles.outlineBtn} onClick={onBack}>
            ← Voltar para Meus Eventos
          </button>
        </p>

        <div className={styles.heading}>
          <div>
            <h2>Inscrições — {form?.titulo}</h2>
            <p>{items.length} inscrição(ões) registrada(s) no total.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={styles.outlineBtn} type="button" onClick={printAttendanceList}>
              <Printer size={17} /> Lista de Presença
            </button>
            {Boolean(items.length) && (
              <button className={styles.secondary} type="button" onClick={() => exportCsv(form, fields, filteredItems)}>
                <Download size={17} /> Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* FILTROS E BUSCA DE PARTICIPANTES */}
        <div style={{ display: 'flex', gap: '12px', margin: '16px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filtrar por nome, e-mail ou voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.formInput}
            style={{ maxWidth: '320px' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['todos', 'confirmada', 'pendente', 'cancelada'].map((st) => (
              <button
                key={st}
                type="button"
                className={`${styles.filterPill} ${filterStatus === st ? styles.filterActive : ''}`}
                onClick={() => setFilterStatus(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CABEÇALHO PARA LISTA DE PRESENÇA (IMPRESSÃO) */}
      <div className={styles.printOnlyHeader}>
        <h2>Prefeitura Municipal de Garça — Lista Oficial de Presença</h2>
        <h3>{form?.titulo}</h3>
        <p>Data: {localDate(form?.dataEvento)} | Local: {form?.local || 'Garça / SP'}</p>
      </div>

      {loading ? (
        <p>Carregando inscrições…</p>
      ) : !filteredItems.length ? (
        <div className={styles.empty}>Nenhuma inscrição encontrada com os critérios informados.</div>
      ) : (
        <div className={styles.responseTable}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Inscrito</th>
                <th>Voucher</th>
                <th>Status</th>
                {fields.map((f) => (
                  <th key={f.fieldId}>{f.label}</th>
                ))}
                <th className={styles.noPrint}>Data</th>
                <th className={styles.noPrint}>Ações</th>
                <th className={styles.printOnlyColumn}>Assinatura do Participante</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr key={item._id}>
                  <td>{idx + 1}</td>
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
                  <td className={styles.noPrint}>{localDate(item.createdAt)}</td>
                  <td className={styles.noPrint}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => setSelectedItem(item)}
                        title="Ver respostas completas"
                      >
                        <Eye size={14} />
                      </button>
                      {item.status !== 'confirmada' && (
                        <button
                          type="button"
                          className={styles.miniBtn}
                          onClick={() => handleStatusChange(item, 'confirmada')}
                          title="Confirmar inscrição"
                        >
                          <CheckCircle2 size={14} color="#16a34a" />
                        </button>
                      )}
                      {item.status !== 'cancelada' && (
                        <button
                          type="button"
                          className={styles.miniBtn}
                          onClick={() => handleStatusChange(item, 'cancelada')}
                          title="Cancelar inscrição"
                        >
                          <XCircle size={14} color="#dc2626" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className={styles.printOnlyColumn} style={{ width: '220px', borderBottom: '1px solid #000' }}>
                    &nbsp;
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DETALHES DO PARTICIPANTE */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Detalhes da Inscrição</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p><strong>Participante:</strong> {selectedItem.userName}</p>
              <p><strong>E-mail:</strong> {selectedItem.userEmail || '—'}</p>
              <p><strong>Telefone:</strong> {selectedItem.userPhone || '—'}</p>
              <p><strong>CPF:</strong> {selectedItem.userCpf || '—'}</p>
              <p><strong>Voucher:</strong> <code>{selectedItem.voucherCode}</code></p>
              <p><strong>Situação:</strong> {selectedItem.status}</p>
              <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
              <h4>Respostas aos Campos:</h4>
              {fields.map((f) => (
                <div key={f.fieldId} style={{ marginBottom: '8px' }}>
                  <strong>{f.label}:</strong> {formatAnswer(selectedItem.formData?.[f.fieldId])}
                </div>
              ))}
              {Array.isArray(selectedItem.arquivos) && selectedItem.arquivos.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h4>Arquivos Anexados:</h4>
                  {selectedItem.arquivos.map((arq, i) => (
                    <div key={i}>
                      <a href={arq.fileLink} target="_blank" rel="noreferrer" style={{ color: '#1e3a8a', textDecoration: 'underline' }}>
                        {arq.originalName || 'Anexo ' + (i + 1)}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
