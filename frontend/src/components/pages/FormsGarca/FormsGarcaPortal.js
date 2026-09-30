import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Users,
  XCircle,
  Printer,
  Eye,
  ArrowUp,
  ArrowDown,
  ListPlus,
  UploadCloud,
  AlertCircle,
  Archive,
  Send,
  X
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
import {
  FormsAppShell,
  FormsPageHeader,
  FormsStickyActionBar,
  FormsStatusBadge,
  FormsSectionCard,
  FormsEventsList,
} from './components'
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
  const [editorStep, setEditorStep] = useState('info') // 'info' | 'rules' | 'fields' | 'appearance' | 'publish'
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
    setEditorStep('info')
    setTab('editor')
  }

  function startEdit(form, step = 'info') {
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
    setEditorStep(step)
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

  // Mapeamento bidirecional da Sidebar como fonte única de navegação
  const activeSection = useMemo(() => {
    if (tab === 'events') return 'events'
    if (tab === 'dashboard') return 'dashboard'
    if (tab === 'responses') return 'responses'
    if (tab === 'editor') return editorStep
    return 'events'
  }, [tab, editorStep])

  const handleSelectSection = (sectionId) => {
    if (sectionId === 'events') {
      setTab('events')
      return
    }

    if (!activeForm?._id) return

    if (sectionId === 'dashboard') {
      openDashboard(activeForm)
    } else if (sectionId === 'responses') {
      openResponses(activeForm)
    } else if (['info', 'rules', 'fields', 'appearance', 'publish'].includes(sectionId)) {
      setEditorStep(sectionId)
      if (tab !== 'editor') {
        startEdit(activeForm, sectionId)
      }
    }
  }

  return (
    <FormsAppShell
      activeSection={activeSection}
      onSelectSection={handleSelectSection}
      activeEvent={activeForm?._id ? activeForm : null}
      onBackToEvents={() => setTab('events')}
    >
      <div className={styles.portalContainer}>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {notice && <div className={styles.success} role="status">{notice}</div>}

        {/* 1. MEUS EVENTOS */}
        {tab === 'events' && (
          <FormsEventsList
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
            onManage={openDashboard}
            onResponses={openResponses}
            onDuplicate={handleDuplicate}
            onPublish={handlePublish}
            onArchive={handleArchive}
            onDelete={handleDelete}
            error={error}
            onRetry={loadData}
          />
        )}

        {/* 2. PAINEL DO EVENTO (DASHBOARD) */}
        {tab === 'dashboard' && dashboardData && (
          <EventDashboardPage
            data={dashboardData}
            onBack={() => setTab('events')}
            onEdit={() => startEdit(dashboardData.event, 'info')}
            onResponses={() => openResponses(dashboardData.event)}
            onPublish={() => handlePublish(dashboardData.event)}
            onArchive={() => handleArchive(dashboardData.event)}
          />
        )}

        {/* 3. CONFIGURAÇÃO / EDIÇÃO DO EVENTO */}
        {tab === 'editor' && (
          <EventSettingsPage
            initial={activeForm || EMPTY_FORM}
            currentStep={editorStep}
            onStepChange={setEditorStep}
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
      </div>
    </FormsAppShell>
  )
}

/* =========================================================================
   COMPONENTE: PAINEL DO EVENTO (VISÃO GERAL / DASHBOARD)
   ========================================================================= */
function EventDashboardPage({
  data,
  onBack,
  onEdit,
  onResponses,
  onPublish,
  onArchive,
}) {
  const [copied, setCopied] = useState(false)
  const event = data.event || {}
  const indicators = data.indicators || {}
  const alerts = data.alerts || []

  const publicUrl = event.slug
    ? `${window.location.origin}/formularios/evento/${event.slug}`
    : ''

  function copyLink() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const occupancyRate = indicators.limite
    ? Math.min(100, Math.round((indicators.vagasOcupadas / indicators.limite) * 100))
    : null

  return (
    <div className={styles.dashboardGrid}>
      <FormsPageHeader
        eyebrow="Painel Executivo"
        title={event.titulo}
        description={`Status: ${event.status} | Data do evento: ${localDate(event.dataEvento)}`}
        actions={
          <div className={styles.dashboardActions}>
            <button type="button" className={styles.secondary} onClick={onEdit}>
              <Settings size={15} /> Editar
            </button>
            <button type="button" className={styles.primary} onClick={onResponses}>
              <Users size={15} /> Gerenciar Inscritos ({indicators.totalInscritos})
            </button>
            {event.status === 'rascunho' && (
              <button type="button" className={styles.primary} onClick={onPublish}>
                <Send size={15} /> Publicar Evento
              </button>
            )}
            {event.status !== 'arquivado' && (
              <button type="button" className={styles.outlineBtn} onClick={onArchive}>
                <Archive size={15} /> Arquivar
              </button>
            )}
          </div>
        }
      />

      {/* ALERTAS PREVENTIVOS */}
      {alerts && alerts.length > 0 && (
        <div className={styles.alertsContainer}>
          {alerts.map((al, idx) => (
            <div key={idx} className={`${styles.alertBox} ${styles['alert_' + al.type]}`}>
              <AlertCircle size={15} />
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
              <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.outlineBtn}
            >
              <ExternalLink size={14} /> Abrir Página
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
   COMPONENTE: CONFIGURAÇÃO DO EVENTO (ORGANIZADO EM SEÇÕES)
   ========================================================================= */
function EventSettingsPage({
  initial,
  currentStep = 'info',
  onStepChange,
  onCancel,
  onSaved,
  setError,
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
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

  async function submit(e) {
    if (e) e.preventDefault()
    if (!form.titulo?.trim()) {
      setError('O Título do evento é obrigatório. Por favor, preencha no Passo 1.')
      if (onStepChange) onStepChange('info')
      return
    }
    if (!form.dataEvento) {
      setError('A Data do evento é obrigatória. Por favor, preencha no Passo 1.')
      if (onStepChange) onStepChange('info')
      return
    }
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
    <form className={styles.editorForm} onSubmit={submit}>
      <FormsPageHeader
        eyebrow="Configuração do Evento"
        title={isEdit ? form.titulo || 'Editar formulário' : 'Novo formulário'}
        description="Preencha os dados do evento. Navegue pelas seções na barra lateral e salve a qualquer momento pela barra inferior."
      />

      {/* SEÇÃO 1: DADOS BÁSICOS E PERÍODO */}
      <div id="sec-info">
        <FormsSectionCard
          title="Dados Básicos e Identificação"
          subtitle="Nome oficial, datas principais e modalidade do evento"
        >
          <div className={styles.grid}>
            <label className={styles.formLabel}>
              Título *
              <input
                name="titulo"
                value={form.titulo}
                onChange={update}
                required
                placeholder="Nome do evento ou processo"
              />
            </label>
            <label className={styles.formLabel}>
              Data do evento *
              <input
                name="dataEvento"
                type="date"
                value={form.dataEvento}
                onChange={update}
                required
              />
            </label>
          </div>

          <div className={styles.grid}>
            <label className={styles.formLabel}>
              Complemento do nome / Edição
              <input
                name="subtitulo"
                value={form.subtitulo || ''}
                onChange={update}
                placeholder="Ex: Edição 2026 / Vagas Remanescentes"
              />
            </label>
            <label className={styles.formLabel}>
              Data de Encerramento (opcional)
              <input
                name="dataFim"
                type="date"
                value={form.dataFim || ''}
                onChange={update}
              />
            </label>
          </div>

          <div className={styles.grid3}>
            <label className={styles.formLabel}>
              Tipo de Evento
              <select name="tipoEvento" value={form.tipoEvento || 'presencial'} onChange={update}>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </label>
            <label className={styles.formLabel}>
              Status
              <select name="status" value={form.status} onChange={update}>
                <option value="aberto">Aberto</option>
                <option value="rascunho">Rascunho</option>
                <option value="emAndamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </label>
            <label className={styles.formLabel}>
              ID da Solicitação 1Doc (opcional)
              <input
                name="idSolicitacao1Doc"
                value={form.idSolicitacao1Doc || ''}
                onChange={update}
                placeholder="Ex: 12345/2026"
              />
            </label>
          </div>

          <div className={styles.grid}>
            <label className={styles.formLabel}>
              Nome do Local
              <input
                name="local"
                value={form.local || ''}
                onChange={update}
                placeholder="Ex: Teatro Municipal de Garça"
              />
            </label>
            <label className={styles.formLabel}>
              Endereço / Logradouro
              <input
                name="endereco"
                value={form.endereco || ''}
                onChange={update}
                placeholder="Ex: Rua Barão do Rio Branco"
              />
            </label>
          </div>

          <label className={styles.formLabel}>
            Descrição Detalhada do Evento
            <textarea
              name="descricao"
              value={form.descricao || ''}
              onChange={update}
              rows={3}
              placeholder="Descreva o objetivo do evento, público-alvo e instruções importantes..."
            />
          </label>
        </FormsSectionCard>
      </div>

      {/* SEÇÃO 2: INSCRIÇÕES E REGRAS */}
      <div id="sec-rules">
        <FormsSectionCard
          title="Regras de Inscrição e Vagas"
          subtitle="Defina o período de adesão, limites de capacidade e orientações ao participante"
        >
          <div className={styles.grid}>
            <label className={styles.formLabel}>
              Início das Inscrições
              <input
                name="inicioInscricoes"
                type="date"
                value={form.inicioInscricoes || ''}
                onChange={update}
              />
            </label>
            <label className={styles.formLabel}>
              Término das Inscrições
              <input
                name="fimInscricoes"
                type="date"
                value={form.fimInscricoes || ''}
                onChange={update}
              />
            </label>
          </div>

          <div className={styles.grid}>
            <label className={styles.formLabel}>
              Limite de Inscrições / Vagas
              <input
                name="limiteInscricoes"
                type="number"
                min="0"
                value={form.limiteInscricoes || ''}
                onChange={update}
                placeholder="Deixe em branco para vagas ilimitadas"
              />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
              <label className={styles.checkboxLabel}>
                <input
                  name="inscricoesAbertas"
                  type="checkbox"
                  checked={Boolean(form.inscricoesAbertas)}
                  onChange={update}
                />
                Inscrições Abertas Imediatamente
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  name="permitirMultiplasInscricoes"
                  type="checkbox"
                  checked={Boolean(form.permitirMultiplasInscricoes)}
                  onChange={update}
                />
                Permitir mais de uma inscrição pelo mesmo CPF
              </label>
            </div>
          </div>

          <label className={styles.formLabel}>
            Orientações ao Participante
            <textarea
              name="orientacoesInscricao"
              value={form.orientacoesInscricao || ''}
              onChange={update}
              rows={2}
              placeholder="Instruções sobre documentação necessária, horários de chegada, etc."
            />
          </label>

          <label className={styles.formLabel}>
            Mensagem de Confirmação (exibida no comprovante/voucher)
            <textarea
              name="mensagemConfirmacao"
              value={form.mensagemConfirmacao || ''}
              onChange={update}
              rows={2}
            />
          </label>
        </FormsSectionCard>
      </div>

      {/* SEÇÃO 3: CAMPOS DO FORMULÁRIO */}
      <div id="sec-fields">
        <FormsSectionCard
          title="Campos Personalizados do Formulário"
          subtitle="Configure as perguntas que os munícipes responderão ao se inscreverem"
          action={
            <button type="button" className={styles.primary} onClick={addField}>
              <Plus size={15} /> Adicionar campo
            </button>
          }
        >
          {form.campos.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '24px 16px' }}>
              <ListPlus size={32} className={styles.emptyIcon} />
              <h4>Nenhum campo personalizado adicionado</h4>
              <p>O formulário coletará por padrão Nome, E-mail, CPF e Telefone do usuário autenticado.</p>
              <button type="button" className={styles.secondary} onClick={addField}>
                + Adicionar meu primeiro campo
              </button>
            </div>
          ) : (
            <div className={styles.fieldsList}>
              {form.campos.map((field, index) => (
                <div key={field.id || index} className={styles.fieldItem}>
                  <div className={styles.fieldItemLeft}>
                    <div className={styles.fieldOrderActions}>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        title="Mover para cima"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => moveField(index, 1)}
                        disabled={index === form.campos.length - 1}
                        title="Mover para baixo"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <div className={styles.fieldDetails} style={{ flex: 1 }}>
                      <div className={styles.fieldTitleRow}>
                        <label className={styles.formLabel} style={{ width: '100%', margin: 0 }}>
                          Rótulo *
                          <input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Ex: Nome da Escola / Tamanho da Camiseta"
                            required
                          />
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                        <label className={styles.formLabel} style={{ minWidth: 160, margin: 0 }}>
                          Tipo
                          <select
                            value={field.type}
                            onChange={(e) => updateField(index, { type: e.target.value })}
                          >
                            {FIELD_TYPES.map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </label>

                        <label className={styles.checkboxLabel} style={{ marginTop: 18 }}>
                          <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                          />
                          Obrigatório
                        </label>
                      </div>

                      {['select', 'radio', 'checkbox'].includes(field.type) && (
                        <label className={styles.formLabel} style={{ marginTop: 8 }}>
                          Opções de resposta (uma por linha)
                          <textarea
                            rows={3}
                            value={(field.options || []).join('\n')}
                            onChange={(e) =>
                              updateField(index, {
                                options: e.target.value
                                  .split('\n')
                                  .map((o) => o.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.iconDanger}
                    onClick={() => removeField(index)}
                    title="Remover este campo"
                    aria-label={`Remover campo ${field.label || index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FormsSectionCard>
      </div>

      {/* SEÇÃO 4: APARÊNCIA E WHITE LABEL */}
      <div id="sec-appearance">
        <FormsSectionCard
          title="Identidade Visual e White Label"
          subtitle="Personalize cores institucionais, logotipo e banner de divulgação do evento"
        >
          {uploadError && <div className={styles.error}>{uploadError}</div>}

          <div className={styles.grid}>
            <label className={styles.formLabel}>
              Cor Primária Institucional
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  name="corPrimaria"
                  value={form.corPrimaria || '#1e3a8a'}
                  onChange={update}
                  style={{ width: 44, height: 38, padding: 2, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  name="corPrimaria"
                  value={form.corPrimaria || '#1e3a8a'}
                  onChange={update}
                  placeholder="#1e3a8a"
                  style={{ flex: 1 }}
                />
              </div>
            </label>

            <label className={styles.formLabel}>
              Organizador Responsável
              <input
                name="organizadorNome"
                value={form.organizadorNome || ''}
                onChange={update}
                placeholder="Ex: Secretaria Municipal de Educação"
              />
            </label>
          </div>

          <div className={styles.grid}>
            {/* LOGOTIPO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className={styles.formLabel}>
                Logotipo do Evento / Órgão
                <input
                  name="logoUrl"
                  value={form.logoUrl || ''}
                  onChange={update}
                  placeholder="https://... ou faça upload abaixo"
                />
              </label>

              <label className={styles.secondary} style={{ cursor: 'pointer', textAlign: 'center', justifyContent: 'center' }}>
                <UploadCloud size={16} />
                <span>{uploadingLogo ? 'Enviando arquivo...' : 'Upload de Logotipo (PNG/JPG)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  style={{ display: 'none' }}
                  disabled={uploadingLogo}
                />
              </label>

              {form.logoUrl && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={form.logoUrl}
                    alt="Prévia do Logotipo"
                    style={{ maxHeight: 42, maxWidth: 140, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 4, padding: 4 }}
                  />
                  <button type="button" className={styles.iconDanger} onClick={() => setForm(c => ({ ...c, logoUrl: '' }))} title="Remover logotipo">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* BANNER */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className={styles.formLabel}>
                Banner Superior de Divulgação
                <input
                  name="bannerUrl"
                  value={form.bannerUrl || ''}
                  onChange={update}
                  placeholder="https://... ou faça upload abaixo"
                />
              </label>

              <label className={styles.secondary} style={{ cursor: 'pointer', textAlign: 'center', justifyContent: 'center' }}>
                <UploadCloud size={16} />
                <span>{uploadingBanner ? 'Enviando arquivo...' : 'Upload de Banner (1200x400 ideal)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBanner}
                  style={{ display: 'none' }}
                  disabled={uploadingBanner}
                />
              </label>

              {form.bannerUrl && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={form.bannerUrl}
                    alt="Prévia do Banner"
                    style={{ maxHeight: 50, maxWidth: 180, objectFit: 'cover', border: '1px solid #e2e8f0', borderRadius: 4 }}
                  />
                  <button type="button" className={styles.iconDanger} onClick={() => setForm(c => ({ ...c, bannerUrl: '' }))} title="Remover banner">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </FormsSectionCard>
      </div>

      {/* SEÇÃO 5: CONFIGURAÇÕES AVANÇADAS & PUBLICAÇÃO */}
      <div id="sec-publish">
        <FormsSectionCard
          title="Revisão e Checklist de Publicação"
          subtitle="Verifique o checklist dos dados antes de disponibilizar para a população"
          collapsible
          defaultCollapsed={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {form.titulo ? <CheckCircle2 size={17} color="#15803d" /> : <XCircle size={17} color="#b91c1c" />}
              <span>Título do evento: <strong>{form.titulo || 'Não preenchido (obrigatório)'}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {form.dataEvento ? <CheckCircle2 size={17} color="#15803d" /> : <XCircle size={17} color="#b91c1c" />}
              <span>Data do evento: <strong>{localDate(form.dataEvento)}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={17} color="#15803d" />
              <span>Campos personalizados: <strong>{form.campos.length} campo(s) cadastrado(s)</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={17} color="#15803d" />
              <span>Limite de vagas: <strong>{form.limiteInscricoes ? `${form.limiteInscricoes} vagas` : 'Ilimitado'}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={17} color="#15803d" />
              <span>Inscrições abertas: <strong>{form.inscricoesAbertas ? 'Sim' : 'Fechadas'}</strong></span>
            </div>
          </div>
        </FormsSectionCard>
      </div>

      {/* ACTION BAR STICKY NO RODAPÉ */}
      <FormsStickyActionBar
        onCancel={onCancel}
        cancelLabel="Voltar aos eventos"
        onSave={() => submit()}
        saveLabel="Salvar formulário"
        saving={saving}
      />
    </form>
  )
}

/* =========================================================================
   COMPONENTE: RESPOSTAS E INSCRIÇÕES (GESTÃO DE PARTICIPANTES)
   ========================================================================= */
function ResponsesPage({ form, items, loading, onBack, onRefresh }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [actionError, setActionError] = useState('')

  const fields = useMemo(() => form?.campos || [], [form])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'todos' && item.status !== statusFilter) return false
      if (!search.trim()) return true
      const term = search.toLowerCase()
      const inName = (item.userName || '').toLowerCase().includes(term)
      const inEmail = (item.userEmail || '').toLowerCase().includes(term)
      const inCpf = (item.userCpf || '').toLowerCase().includes(term)
      const inVoucher = (item.voucherCode || '').toLowerCase().includes(term)
      return inName || inEmail || inCpf || inVoucher
    })
  }, [items, search, statusFilter])

  async function handleStatusChange(item, nextStatus) {
    if (!window.confirm(`Deseja alterar a inscrição de ${item.userName} para "${nextStatus}"?`)) return
    setActionError('')
    try {
      await updateInscriptionStatus(item._id, nextStatus)
      if (onRefresh) await onRefresh()
      if (selectedItem?._id === item._id) {
        setSelectedItem((curr) => ({ ...curr, status: nextStatus }))
      }
    } catch (err) {
      setActionError(errorOf(err))
    }
  }

  function handlePrint(item) {
    const printWin = window.open('', '_blank', 'width=800,height=600')
    if (!printWin) return
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprovante de Inscrição — ${item.voucherCode}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #18213b; }
          .header { border-bottom: 2px solid #2549a0; padding-bottom: 12px; margin-bottom: 20px; }
          .voucher { font-size: 24px; font-weight: bold; color: #2549a0; background: #e7efff; padding: 8px 16px; border-radius: 6px; display: inline-block; }
          .section { margin: 16px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #dbe2ef; padding: 8px 12px; text-align: left; }
          th { background: #f2f5fa; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Prefeitura Municipal de Garça</h2>
          <p>Comprovante Oficial de Inscrição — Forms Garça</p>
        </div>
        <div class="section">
          <h3>${form?.titulo || 'Evento'}</h3>
          <p><strong>Participante:</strong> ${item.userName}</p>
          <p><strong>CPF:</strong> ${item.userCpf || '—'} | <strong>E-mail:</strong> ${item.userEmail || '—'}</p>
          <p><strong>Data da Inscrição:</strong> ${localDate(item.createdAt)}</p>
          <div class="voucher">VOUCHER: ${item.voucherCode}</div>
        </div>
        <div class="section">
          <h4>Respostas do Formulário:</h4>
          <table>
            <thead><tr><th>Campo</th><th>Resposta</th></tr></thead>
            <tbody>
              ${fields.map(f => `<tr><td>${f.label}</td><td>${formatAnswer(item.formData?.[f.fieldId])}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => {
      printWin.print()
      printWin.close()
    }, 400)
  }

  return (
    <div>
      <FormsPageHeader
        eyebrow="Gestão de Participantes"
        title={`Inscrições — ${form?.titulo || 'Evento'}`}
        description={`${items.length} inscrição(ões) recebida(s) no total.`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={styles.outlineBtn} onClick={onBack}>
              Voltar
            </button>
            {Boolean(items.length) && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => exportCsv(form, fields, items)}
              >
                <Download size={15} /> Exportar CSV
              </button>
            )}
          </div>
        }
      />

      {actionError && <div className={styles.error}>{actionError}</div>}

      {/* FILTROS E BUSCA DE INSCRITOS */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox} style={{ maxWidth: 360 }}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Filtrar por nome, CPF ou voucher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.statusFilters}>
          {['todos', 'confirmado', 'pendente', 'cancelado'].map((st) => (
            <button
              key={st}
              type="button"
              className={`${styles.filterPill} ${statusFilter === st ? styles.filterActive : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <button type="button" className={styles.iconBtn} onClick={onRefresh} title="Atualizar inscritos">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando inscritos...</div>
      ) : !items.length ? (
        <div className={styles.emptyState}>
          <Users size={44} className={styles.emptyIcon} />
          <h3>Nenhuma inscrição recebida</h3>
          <p>Assim que os cidadãos preencherem a página pública, os vouchers e respostas aparecerão aqui.</p>
        </div>
      ) : (
        <div className={styles.responseTableWrapper}>
          <table className={styles.responseTable}>
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Inscrito</th>
                <th>Status</th>
                <th>CPF</th>
                {fields.slice(0, 3).map((f) => (
                  <th key={f.fieldId}>{f.label}</th>
                ))}
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item._id}>
                  <td>
                    <code>{item.voucherCode}</code>
                  </td>
                  <td>
                    <strong>{item.userName}</strong>
                    {item.userEmail && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.userEmail}</div>}
                  </td>
                  <td>
                    <FormsStatusBadge status={item.status || 'confirmado'} size="sm" />
                  </td>
                  <td>{item.userCpf || '—'}</td>
                  {fields.slice(0, 3).map((f) => (
                    <td key={f.fieldId}>{formatAnswer(item.formData?.[f.fieldId])}</td>
                  ))}
                  <td>{localDate(item.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className={styles.secondary}
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        onClick={() => setSelectedItem(item)}
                        title="Ver detalhes"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        onClick={() => handlePrint(item)}
                        title="Imprimir comprovante"
                      >
                        <Printer size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE DETALHES DA INSCRIÇÃO */}
      {selectedItem && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Comprovante #{selectedItem.voucherCode}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Inscrito em {localDate(selectedItem.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setSelectedItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <small style={{ color: '#64748b', display: 'block' }}>Nome do Participante</small>
                  <strong>{selectedItem.userName}</strong>
                </div>
                <div>
                  <small style={{ color: '#64748b', display: 'block' }}>CPF</small>
                  <strong>{selectedItem.userCpf || '—'}</strong>
                </div>
                <div>
                  <small style={{ color: '#64748b', display: 'block' }}>E-mail</small>
                  <span>{selectedItem.userEmail || '—'}</span>
                </div>
                <div>
                  <small style={{ color: '#64748b', display: 'block' }}>Telefone</small>
                  <span>{selectedItem.userPhone || '—'}</span>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                  Respostas aos Campos Personalizados
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {fields.map((f) => (
                    <div key={f.fieldId} style={{ background: '#f8fafc', padding: 8, borderRadius: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>{f.label}</span>
                      <strong style={{ fontSize: '0.9rem' }}>{formatAnswer(selectedItem.formData?.[f.fieldId])}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              {selectedItem.status !== 'confirmado' && (
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => handleStatusChange(selectedItem, 'confirmado')}
                >
                  Marcar como Confirmado
                </button>
              )}
              {selectedItem.status !== 'cancelado' && (
                <button
                  type="button"
                  className={styles.dangerBtn}
                  onClick={() => handleStatusChange(selectedItem, 'cancelado')}
                >
                  Cancelar Inscrição
                </button>
              )}
              <button
                type="button"
                className={styles.secondary}
                onClick={() => handlePrint(selectedItem)}
              >
                <Printer size={15} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatAnswer(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value == null || value === '' ? '—' : String(value)
}

function exportCsv(form, fields, items) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const header = ['Inscrito', 'Voucher', 'Status', 'CPF', 'E-mail', ...fields.map((f) => f.label), 'Data']
  const rows = items.map((item) => [
    item.userName,
    item.voucherCode,
    item.status || 'confirmado',
    item.userCpf || '',
    item.userEmail || '',
    ...fields.map((f) => formatAnswer(item.formData?.[f.fieldId])),
    localDate(item.createdAt),
  ])
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(quote).join(';')).join('\n')}`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `inscricoes-${String(form?.titulo || 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
