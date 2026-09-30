import React, { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  Settings,
  Users,
  Printer,
  Eye,
  AlertCircle,
  Archive,
  Send,
  X
} from 'lucide-react'
import {
  deleteForm,
  getFormDashboard,
  getStatistics,
  listForms,
  listInscriptions,
  duplicateForm,
  publishForm,
  archiveForm,
  updateInscriptionStatus,
} from '../../../services/formsGarcaService'
import {
  FormsAppShell,
  FormsPageHeader,
  FormsStatusBadge,
  FormsEventsList,
} from './components'
import FormsEventEditor from './components/FormsEventEditor'
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
          <FormsEventEditor
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
