import { useEffect, useState } from 'react'
import {
  getAdminDashboard,
  listAdminEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  listAdminPosts,
  createPost,
  updatePost,
  publishPost,
  archivePost,
} from '../../../../services/educationService'
import {
  ENTITY_TYPE_LABELS,
  POST_TYPE_LABELS,
  POST_STATUS_LABELS,
  POST_ATTACHMENT_TYPE_LABELS,
  FEATURED_MEDIA_LABELS,
  MAX_EDUCATION_UPLOAD_LABEL,
  formatDateTime,
  extractYouTubeVideoId,
  youtubeThumbnailUrl,
  postThumbnail,
  mediaUrl,
} from '../educationUtils'
import styles from './EducationAdminPortal.module.css'
import CouncilAdminPanel from './CouncilAdminPanel'
import EntityUnitForm from './EntityUnitForm'
import { filterCouncils, filterSchoolUnits, getUnitImagePath } from './entityUnitFormUtils'
import { buildPostFormData, buildPostJsonPayload, defaultMetaFromFile, extractPostSubmitError, postAttachmentsToForm, postFormNeedsMultipart, postToForm, validatePostEntityLink, validatePostExternalLinks } from './postFormUtils'
import CalendarAdminPanel from './CalendarAdminPanel'
import LessonAssignmentAdminPanel from './LessonAssignmentAdminPanel'
import PartnerEntityAdminPanel from './PartnerEntityAdminPanel'
import LegislationAdminPanel from './LegislationAdminPanel'
import MunicipalPlanAdminPanel from './MunicipalPlanAdminPanel'
import EarlyChildhoodPolicyAdminPanel from './EarlyChildhoodPolicyAdminPanel'
import SchoolMenuAdminPanel from './SchoolMenuAdminPanel'
import AssignmentsAdminPanel from './AssignmentsAdminPanel'
import { deriveEducationCapabilities, visibleEducationTabs } from './educationAdminCapabilities'

const TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'assignments', label: 'Usuários e permissões' },
  { id: 'entities', label: 'Unidades' },
  { id: 'councils', label: 'Conselhos' },
  { id: 'posts', label: 'Publicações' },
  { id: 'calendar', label: 'Calendário Escolar' },
  { id: 'lesson-assignments', label: 'Atribuição de Aulas' },
  { id: 'partner-entities', label: 'Entidades Conveniadas' },
  { id: 'municipal-plan', label: 'Plano Municipal' },
  { id: 'early-childhood-policy', label: 'Política Educação Infantil' },
  { id: 'school-menu', label: 'Cardápio Escolar' },
  { id: 'legislation', label: 'Legislação' },
]

export default function EducationAdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [entities, setEntities] = useState([])
  const [schoolUnits, setSchoolUnits] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  const [entityFormKey, setEntityFormKey] = useState(0)
  const [entitySubmitting, setEntitySubmitting] = useState(false)
  const [postForm, setPostForm] = useState({
    educationEntityId: '',
    title: '',
    slug: '',
    type: 'comunicado',
    summary: '',
    content: '',
    authorName: '',
    sourceUrl: '',
    featuredMediaType: 'image',
    youtubeUrl: '',
    featured: false,
  })
  const [coverFile, setCoverFile] = useState(null)
  const [existingCoverPreview, setExistingCoverPreview] = useState('')
  const [editingPostId, setEditingPostId] = useState(null)
  const [editingPostStatus, setEditingPostStatus] = useState(null)
  const [postSubmitting, setPostSubmitting] = useState(false)
  const [existingAttachments, setExistingAttachments] = useState([])
  const [newPdfFiles, setNewPdfFiles] = useState([])
  const [attachmentsMeta, setAttachmentsMeta] = useState([])
  const [editingEntity, setEditingEntity] = useState(null)

  function showMsg(text, ok = true) {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 4000)
  }

  async function fetchAllAdminEntities() {
    const items = []
    let page = 1
    let pages = 1
    do {
      const res = await listAdminEntities({ page, limit: 50 })
      const batch = res.data?.data || []
      items.push(...batch)
      pages = Number(res.data?.pages) || 1
      page += 1
    } while (page <= pages)
    return items
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [dashRes, allEntities, postRes] = await Promise.all([
        getAdminDashboard(),
        fetchAllAdminEntities(),
        listAdminPosts({ limit: 50 }),
      ])
      setDashboard(dashRes.data?.data || null)
      setEntities(allEntities)
      setSchoolUnits(filterSchoolUnits(allEntities))
      setPosts(postRes.data?.data || [])
    } catch {
      showMsg('Erro ao carregar dados.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const capabilities = deriveEducationCapabilities(dashboard)
  const allowedTabIds = visibleEducationTabs(dashboard)

  useEffect(() => {
    if (!dashboard) return
    if (!allowedTabIds.includes(tab)) {
      setTab(allowedTabIds[0] || 'overview')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard, allowedTabIds.join(',')])

  useEffect(() => {
    if (tab !== 'overview') {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function handleCreateEntity(formData) {
    setEntitySubmitting(true)
    try {
      await createEntity(formData)
      setEntityFormKey((k) => k + 1)
      showMsg('Unidade criada com sucesso.')
      loadAll()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao criar unidade.', false)
    } finally {
      setEntitySubmitting(false)
    }
  }

  async function handleUpdateEntity(formData) {
    if (!editingEntity?._id) return
    setEntitySubmitting(true)
    try {
      await updateEntity(editingEntity._id, formData)
      setEditingEntity(null)
      setEntityFormKey((k) => k + 1)
      showMsg('Unidade atualizada.')
      loadAll()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao salvar.', false)
    } finally {
      setEntitySubmitting(false)
    }
  }

  async function handleDeleteEntity(entity) {
    if (!entity?._id) return
    const label = entity.name || entity.slug || 'esta unidade'
    if (!window.confirm(`Excluir permanentemente «${label}»?\n\nEsta ação não pode ser desfeita.`)) return
    try {
      await deleteEntity(entity._id)
      if (editingEntity?._id === entity._id) {
        setEditingEntity(null)
        setEntityFormKey((k) => k + 1)
      }
      showMsg('Unidade excluída.')
      loadAll()
    } catch (err) {
      showMsg(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao excluir unidade.', false)
    }
  }

  function resetPostForm() {
    setPostForm({
      educationEntityId: '',
      title: '',
      slug: '',
      type: 'comunicado',
      summary: '',
      content: '',
      authorName: '',
      sourceUrl: '',
      featuredMediaType: 'image',
      youtubeUrl: '',
      featured: false,
    })
    setCoverFile(null)
    setExistingCoverPreview('')
    setEditingPostId(null)
    setEditingPostStatus(null)
    setExistingAttachments([])
    setNewPdfFiles([])
    setAttachmentsMeta([])
  }

  function startEditPost(post) {
    setEditingPostId(post._id)
    setEditingPostStatus(post.status)
    setPostForm(postToForm(post))
    setCoverFile(null)
    setExistingCoverPreview(postThumbnail(post) || mediaUrl(post.coverImageUrl) || '')
    setExistingAttachments(postAttachmentsToForm(post))
    setNewPdfFiles([])
    setAttachmentsMeta([])
    document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handlePdfFiles(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (!files.length) return
    setNewPdfFiles((prev) => [...prev, ...files])
    setAttachmentsMeta((prev) => [...prev, ...files.map((f) => defaultMetaFromFile(f))])
    e.target.value = ''
  }

  function updateExistingAttachment(index, field, value) {
    setExistingAttachments((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function updateAttachmentMeta(index, field, value) {
    setAttachmentsMeta((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function removeExistingAttachment(index) {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function removeNewPdfFile(index) {
    setNewPdfFiles((prev) => prev.filter((_, i) => i !== index))
    setAttachmentsMeta((prev) => prev.filter((_, i) => i !== index))
  }

  function isExternalAttachment(doc) {
    const url = String(doc?.fileUrl || '').trim()
    return url.startsWith('http://') || url.startsWith('https://')
  }

  function addExternalLinkAttachment() {
    setExistingAttachments((prev) => [
      ...prev,
      {
        title: '',
        documentType: 'outro',
        description: '',
        documentDate: '',
        fileUrl: '',
        originalName: 'Link externo',
      },
    ])
  }

  const schoolUnitsForPosts = filterSchoolUnits(entities)
  const councilsForPosts = filterCouncils(entities)
  const isCouncilPostType = postForm.type === 'conselhos'

  function handlePostTypeChange(nextType) {
    const wasCouncilType = postForm.type === 'conselhos'
    const willBeCouncilType = nextType === 'conselhos'
    let educationEntityId = postForm.educationEntityId
    const currentEntity = entities.find((e) => e._id === educationEntityId)

    if (willBeCouncilType && !wasCouncilType) {
      if (!currentEntity || currentEntity.type !== 'conselho') {
        educationEntityId = ''
      }
    } else if (!willBeCouncilType && wasCouncilType) {
      if (currentEntity?.type === 'conselho') {
        educationEntityId = ''
      }
    }

    setPostForm({ ...postForm, type: nextType, educationEntityId })
  }

  async function submitPost(publish = false) {
    if (!postForm.title?.trim()) {
      showMsg('Informe o título da publicação.', false)
      return
    }
    if (!postForm.educationEntityId) {
      showMsg(
        isCouncilPostType
          ? 'Selecione o conselho ao qual a publicação será vinculada.'
          : 'Selecione a unidade e informe o título.',
        false
      )
      return
    }
    if (postForm.featuredMediaType === 'youtube' && postForm.youtubeUrl && !extractYouTubeVideoId(postForm.youtubeUrl)) {
      showMsg('Link do YouTube inválido.', false)
      return
    }
    const entityLinkError = validatePostEntityLink(postForm, entities)
    if (entityLinkError) {
      showMsg(entityLinkError, false)
      return
    }
    const externalLinkError = validatePostExternalLinks(postForm, existingAttachments)
    if (externalLinkError) {
      showMsg(externalLinkError, false)
      return
    }

    setPostSubmitting(true)
    try {
      const submitOptions = {
        publish,
        editingPostId,
        editingPostStatus,
        coverFile,
        existingAttachments,
        newPdfFiles,
        attachmentsMeta,
      }
      const payload = postFormNeedsMultipart(submitOptions)
        ? buildPostFormData(postForm, submitOptions)
        : buildPostJsonPayload(postForm, submitOptions)

      if (editingPostId) {
        await updatePost(editingPostId, payload)
        showMsg(
          publish
            ? 'Publicação publicada.'
            : editingPostStatus === 'published'
              ? 'Alterações salvas.'
              : 'Rascunho atualizado.'
        )
      } else {
        await createPost(payload)
        showMsg(publish ? 'Publicação publicada com sucesso.' : 'Rascunho salvo.')
      }
      resetPostForm()
      loadAll()
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        showMsg('Sessão expirada. Faça login novamente no painel.', false)
      } else {
        showMsg(extractPostSubmitError(err), false)
      }
    } finally {
      setPostSubmitting(false)
    }
  }

  const youtubePreviewId = extractYouTubeVideoId(postForm.youtubeUrl)

  async function handlePublish(id) {
    try {
      await publishPost(id)
      showMsg('Publicação publicada.')
      loadAll()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao publicar.', false)
    }
  }

  async function handleArchive(id) {
    try {
      await archivePost(id)
      showMsg('Publicação arquivada.')
      loadAll()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao arquivar.', false)
    }
  }

  if (loading && !dashboard) {
    return <div className={styles.muted}>Carregando painel...</div>
  }

  return (
    <>
      <div className={styles.tabs}>
        {TABS.filter((t) => allowedTabIds.includes(t.id)).map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`${styles.message} ${message.ok ? styles.messageOk : styles.messageErr}`}>
          {message.text}
        </div>
      )}

      {tab === 'overview' && dashboard && (
        <div className={styles.panel}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <strong>{dashboard.entities}</strong>
              <span className={styles.muted}>Unidades</span>
            </div>
            <div className={styles.stat}>
              <strong>{dashboard.pendingPosts}</strong>
              <span className={styles.muted}>Publicações em revisão</span>
            </div>
            <div className={styles.stat}>
              <strong>{dashboard.pendingDocuments ?? 0}</strong>
              <span className={styles.muted}>Documentos em revisão</span>
            </div>
            <div className={styles.stat}>
              <strong>{dashboard.recentDocuments}</strong>
              <span className={styles.muted}>Docs (30 dias)</span>
            </div>
            <div className={styles.stat}>
              <strong>{dashboard.upcomingEvents}</strong>
              <span className={styles.muted}>Próximos eventos</span>
            </div>
          </div>
          <p className={styles.muted}>
            Use as abas acima para gerenciar unidades, publicações e calendário.
          </p>
          {capabilities.canManageAssignments && (
            <p className={styles.muted}>
              Para vincular gestores às escolas ou conceder perfis de acesso, use a aba{' '}
              <button
                type="button"
                className={styles.tab}
                style={{ display: 'inline', padding: 0, border: 'none', background: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => setTab('assignments')}
              >
                Usuários e permissões
              </button>
              .
            </p>
          )}

          {schoolUnits.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.25rem' }}>Unidades cadastradas ({schoolUnits.length})</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolUnits.map((e) => (
                      <tr key={e._id}>
                        <td>{e.name}</td>
                        <td>{ENTITY_TYPE_LABELS[e.type] || e.type}</td>
                        <td>{e.isActive ? 'Ativa' : 'Inativa'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {posts.length > 0 && (
            <>
              <h3 style={{ marginTop: '1.25rem' }}>Publicações ({posts.length})</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((p) => (
                      <tr key={p._id}>
                        <td>{p.title}</td>
                        <td>{POST_TYPE_LABELS[p.type] || p.type}</td>
                        <td>{POST_STATUS_LABELS[p.status] || p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <AssignmentsAdminPanel entities={entities} showMsg={showMsg} />
      )}

      {tab === 'entities' && (
        <div className={styles.panel}>
          <h3 id="unit-form" style={{ marginTop: 0 }}>
            {editingEntity ? 'Editar Unidade' : 'Cadastro de unidade'}
          </h3>
          <p className={styles.muted}>
            {editingEntity
              ? 'Edite os dados da unidade selecionada e salve as alterações.'
              : 'Preencha os dados para cadastrar uma nova unidade no portal.'}
          </p>
          <EntityUnitForm
            key={editingEntity?._id || `create-${entityFormKey}`}
            mode={editingEntity ? 'edit' : 'create'}
            entity={editingEntity}
            submitting={entitySubmitting}
            submitLabel={editingEntity ? 'Salvar Alterações' : undefined}
            onCancel={editingEntity ? () => setEditingEntity(null) : undefined}
            onSubmit={editingEntity ? handleUpdateEntity : handleCreateEntity}
          />

          <hr style={{ margin: '1.75rem 0', border: 'none', borderTop: '1px solid #d4e0f0' }} />

          <h3>Unidades cadastradas ({entities.length})</h3>
          <p className={styles.muted}>
            Todos os registros cadastrados no módulo. Clique em Editar para alterar ou em Excluir para remover uma unidade.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Imagem</th>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.muted} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Nenhuma unidade cadastrada ainda.
                    </td>
                  </tr>
                ) : entities.map((e) => {
                  const imagePath = getUnitImagePath(e)
                  const imageSrc = imagePath ? mediaUrl(imagePath) : ''
                  return (
                  <tr key={e._id}>
                    <td>
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt=""
                          className={styles.tableThumb}
                        />
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>{e.name}</td>
                    <td>{ENTITY_TYPE_LABELS[e.type] || e.type}</td>
                    <td>{e.slug}</td>
                    <td>{e.isActive ? 'Ativa' : 'Inativa'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={styles.btn}
                          onClick={() => {
                            setEditingEntity(e)
                            document.getElementById('unit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                        >
                          Editar
                        </button>
                        {capabilities.canManageEntities && (
                          <button
                            type="button"
                            className={styles.btn}
                            onClick={() => handleDeleteEntity(e)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'councils' && (
        <CouncilAdminPanel
          entities={entities}
          onReload={loadAll}
          showMsg={showMsg}
          canManageAssignments={capabilities.canManageAssignments}
        />
      )}

      {tab === 'posts' && (
        <div className={styles.panel}>
          <h3 id="post-form" style={{ marginTop: 0 }}>
            {editingPostId ? 'Editar publicação' : 'Nova publicação'}
          </h3>
          {editingPostId && (
            <p className={styles.muted}>
              Editando: <strong>{postForm.title}</strong>
              {editingPostStatus === 'published' && ' (publicada)'}
            </p>
          )}
          <p className={styles.muted}>
            Modelo de portal de notícias: resumo para listagens, imagem de capa ou vídeo do YouTube em destaque.
          </p>
          <form noValidate onSubmit={(e) => { e.preventDefault(); submitPost(false) }}>
            <div className={styles.formRow}>
              <label className={styles.field}>
                Tipo
                <select
                  value={postForm.type}
                  onChange={(e) => handlePostTypeChange(e.target.value)}
                >
                  {Object.entries(POST_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              {isCouncilPostType ? (
                <label className={styles.field}>
                  Conselho
                  <select
                    required
                    value={postForm.educationEntityId}
                    onChange={(e) => setPostForm({ ...postForm, educationEntityId: e.target.value })}
                  >
                    <option value="">Selecione o conselho...</option>
                    {councilsForPosts.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {councilsForPosts.length === 0 && (
                    <span className={styles.muted}>
                      Nenhum conselho cadastrado. Cadastre um conselho na aba Conselhos.
                    </span>
                  )}
                </label>
              ) : (
                <label className={styles.field}>
                  Unidade
                  <select
                    required
                    value={postForm.educationEntityId}
                    onChange={(e) => setPostForm({ ...postForm, educationEntityId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {schoolUnitsForPosts.map((e) => (
                      <option key={e._id} value={e._id}>{e.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className={`${styles.field} ${styles.formRowFull}`}>
                Título
                <input
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                />
              </label>
              <label className={`${styles.field} ${styles.formRowFull}`}>
                Resumo (chamada para listagens e redes)
                <textarea
                  rows={2}
                  value={postForm.summary}
                  onChange={(e) => setPostForm({ ...postForm, summary: e.target.value })}
                  placeholder="Breve descrição exibida nos cards de notícias"
                />
              </label>

              <section className={`${styles.formSection} ${styles.formRowFull}`}>
                <h4 className={styles.formSectionTitle}>Informações adicionais</h4>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    Slug da URL (opcional)
                    <input
                      value={postForm.slug}
                      onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                      placeholder="ex.: comunicado-reuniao-cme"
                    />
                    <span className={styles.muted}>Gerado automaticamente pelo título se vazio.</span>
                  </label>
                  <label className={styles.field}>
                    Autor / fonte
                    <input
                      value={postForm.authorName}
                      onChange={(e) => setPostForm({ ...postForm, authorName: e.target.value })}
                      placeholder="Ex.: Secretaria Municipal de Educação"
                    />
                  </label>
                  <label className={`${styles.field} ${styles.formRowFull}`}>
                    Link externo complementar
                    <input
                      type="text"
                      inputMode="url"
                      value={postForm.sourceUrl}
                      onChange={(e) => setPostForm({ ...postForm, sourceUrl: e.target.value })}
                      placeholder="https://www.exemplo.gov.br/pagina"
                    />
                    <span className={styles.muted}>
                      Opcional. Aceita endereços com ou sem https:// (ex.: www.site.com.br).
                    </span>
                  </label>
                </div>
              </section>

              <label className={styles.field}>
                Destaque visual
                <select
                  value={postForm.featuredMediaType}
                  onChange={(e) => setPostForm({ ...postForm, featuredMediaType: e.target.value })}
                >
                  {Object.entries(FEATURED_MEDIA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Destaque no carrossel</span>
                <select
                  value={postForm.featured ? 'sim' : 'nao'}
                  onChange={(e) => setPostForm({ ...postForm, featured: e.target.value === 'sim' })}
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </label>

              {postForm.featuredMediaType === 'image' && (
                <label className={`${styles.field} ${styles.formRowFull}`}>
                  Imagem de capa
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  />
                  <span className={styles.muted}>JPG, PNG ou WebP — recomendado 1200×630 px</span>
                  {coverFile ? (
                    <img
                      src={URL.createObjectURL(coverFile)}
                      alt="Prévia"
                      className={styles.previewThumb}
                    />
                  ) : existingCoverPreview ? (
                    <img
                      src={existingCoverPreview}
                      alt="Capa atual"
                      className={styles.previewThumb}
                    />
                  ) : null}
                  {editingPostId && !coverFile && existingCoverPreview && (
                    <span className={styles.muted}>Capa atual. Envie um novo arquivo para substituir.</span>
                  )}
                </label>
              )}

              {postForm.featuredMediaType === 'youtube' && (
                <label className={`${styles.field} ${styles.formRowFull}`}>
                  Link do YouTube
                  <input
                    type="text"
                    inputMode="url"
                    value={postForm.youtubeUrl}
                    onChange={(e) => setPostForm({ ...postForm, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  <span className={styles.muted}>
                    Aceita youtube.com, youtu.be e shorts. A miniatura é gerada automaticamente.
                  </span>
                  {youtubePreviewId && (
                    <img
                      src={youtubeThumbnailUrl(youtubePreviewId)}
                      alt="Prévia do vídeo"
                      className={styles.previewThumb}
                    />
                  )}
                </label>
              )}

              <label className={`${styles.field} ${styles.formRowFull}`}>
                Conteúdo
                <textarea
                  rows={6}
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  placeholder="Texto completo da notícia ou comunicado"
                />
              </label>

              <div className={`${styles.formRowFull}`}>
                <h4 className={styles.formSectionTitle}>Documentos em PDF e links externos</h4>
                <p className={styles.muted}>
                  Anexe editais, atas e outros PDFs (até 10 por publicação, máx. {MAX_EDUCATION_UPLOAD_LABEL} cada)
                  ou inclua links externos para páginas e sistemas fora do portal.
                </p>

                <div className={styles.formActions} style={{ marginBottom: '1rem' }}>
                  <button type="button" className={styles.btn} onClick={addExternalLinkAttachment}>
                    Adicionar link externo
                  </button>
                </div>

                {existingAttachments.map((doc, index) => (
                  <div key={doc.fileUrl || `existing-${index}`} className={styles.pdfMetaCard}>
                    <div className={styles.pdfMetaCardHeader}>
                      <strong>{isExternalAttachment(doc) ? 'Link externo' : 'PDF cadastrado'}</strong>
                      <div className={styles.rowActions}>
                        {doc.fileUrl && (
                          <a
                            href={isExternalAttachment(doc) ? doc.fileUrl : mediaUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.btn}
                          >
                            Abrir
                          </a>
                        )}
                        <button type="button" className={styles.btn} onClick={() => removeExistingAttachment(index)}>
                          Remover
                        </button>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      {isExternalAttachment(doc) || !doc.fileUrl ? (
                        <label className={`${styles.field} ${styles.formRowFull}`}>
                          URL do link
                          <input
                            type="text"
                            inputMode="url"
                            required={isExternalAttachment(doc) || !doc.fileUrl}
                            value={doc.fileUrl || ''}
                            onChange={(e) => updateExistingAttachment(index, 'fileUrl', e.target.value)}
                            placeholder="https://www.exemplo.gov.br/documento"
                          />
                        </label>
                      ) : null}
                      <label className={styles.field}>
                        Título do documento
                        <input
                          value={doc.title}
                          onChange={(e) => updateExistingAttachment(index, 'title', e.target.value)}
                        />
                      </label>
                      <label className={styles.field}>
                        Tipo do documento
                        <select
                          value={doc.documentType || 'outro'}
                          onChange={(e) => updateExistingAttachment(index, 'documentType', e.target.value)}
                        >
                          {Object.entries(POST_ATTACHMENT_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.field}>
                        Data do documento
                        <input
                          type="date"
                          value={doc.documentDate || ''}
                          onChange={(e) => updateExistingAttachment(index, 'documentDate', e.target.value)}
                        />
                      </label>
                      <label className={`${styles.field} ${styles.formRowFull}`}>
                        Descrição / observações
                        <textarea
                          rows={2}
                          value={doc.description || ''}
                          onChange={(e) => updateExistingAttachment(index, 'description', e.target.value)}
                          placeholder="Resumo do conteúdo, número da portaria, referência legal etc."
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <label className={`${styles.field} ${styles.formRowFull}`}>
                  Adicionar arquivos PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handlePdfFiles}
                  />
                </label>

                {attachmentsMeta.map((meta, index) => (
                  <div key={`pdf-meta-${index}`} className={styles.pdfMetaCard}>
                    <div className={styles.pdfMetaCardHeader}>
                      <strong>Novo PDF: {newPdfFiles[index]?.name || 'arquivo'}</strong>
                      <button type="button" className={styles.btn} onClick={() => removeNewPdfFile(index)}>
                        Remover
                      </button>
                    </div>
                    <div className={styles.formRow}>
                      <label className={styles.field}>
                        Título do documento
                        <input
                          value={meta.title}
                          onChange={(e) => updateAttachmentMeta(index, 'title', e.target.value)}
                        />
                      </label>
                      <label className={styles.field}>
                        Tipo do documento
                        <select
                          value={meta.documentType || 'outro'}
                          onChange={(e) => updateAttachmentMeta(index, 'documentType', e.target.value)}
                        >
                          {Object.entries(POST_ATTACHMENT_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.field}>
                        Data do documento
                        <input
                          type="date"
                          value={meta.documentDate || ''}
                          onChange={(e) => updateAttachmentMeta(index, 'documentDate', e.target.value)}
                        />
                      </label>
                      <label className={`${styles.field} ${styles.formRowFull}`}>
                        Descrição / observações
                        <textarea
                          rows={2}
                          value={meta.description || ''}
                          onChange={(e) => updateAttachmentMeta(index, 'description', e.target.value)}
                          placeholder="Resumo do conteúdo, número da portaria, referência legal etc."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.btn}
                disabled={postSubmitting}
              >
                {postSubmitting
                  ? 'Salvando...'
                  : editingPostId
                    ? 'Salvar alterações'
                    : 'Salvar rascunho'}
              </button>
              {(!editingPostId || editingPostStatus !== 'published') && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={postSubmitting}
                  onClick={() => submitPost(true)}
                >
                  {postSubmitting ? 'Publicando...' : 'Publicar agora'}
                </button>
              )}
              <button
                type="button"
                className={styles.btn}
                disabled={postSubmitting}
                onClick={resetPostForm}
              >
                {editingPostId ? 'Cancelar edição' : 'Limpar formulário'}
              </button>
            </div>
          </form>

          <hr style={{ margin: '1.75rem 0', border: 'none', borderTop: '1px solid #d4e0f0' }} />

          <h3>Publicações cadastradas ({posts.length})</h3>
          <p className={styles.muted}>
            Itens já registrados no sistema. Clique em Editar para alterar uma publicação existente.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Mídia</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.muted} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      Nenhuma publicação ainda. Use o formulário acima para criar a primeira.
                    </td>
                  </tr>
                ) : posts.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {postThumbnail(p) ? (
                        <img src={postThumbnail(p)} alt="" style={{ width: 64, borderRadius: 6 }} />
                      ) : '—'}
                    </td>
                    <td>{p.title}</td>
                    <td>{POST_TYPE_LABELS[p.type] || p.type}</td>
                    <td>{FEATURED_MEDIA_LABELS[p.featuredMediaType] || p.featuredMediaType || '—'}</td>
                    <td>{POST_STATUS_LABELS[p.status] || p.status}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          onClick={() => startEditPost(p)}
                        >
                          Editar
                        </button>
                        {p.status !== 'published' && (
                          <button type="button" className={styles.btn} onClick={() => handlePublish(p._id)}>
                            Publicar
                          </button>
                        )}
                        {p.status !== 'archived' && (
                          <button type="button" className={styles.btn} onClick={() => handleArchive(p._id)}>
                            Arquivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <CalendarAdminPanel schoolUnits={schoolUnits} showMsg={showMsg} />
      )}

      {tab === 'lesson-assignments' && (
        <LessonAssignmentAdminPanel entities={entities} showMsg={showMsg} />
      )}

      {tab === 'partner-entities' && (
        <PartnerEntityAdminPanel showMsg={showMsg} />
      )}

      {tab === 'legislation' && (
        <LegislationAdminPanel showMsg={showMsg} />
      )}

      {tab === 'municipal-plan' && (
        <MunicipalPlanAdminPanel showMsg={showMsg} />
      )}

      {tab === 'early-childhood-policy' && (
        <EarlyChildhoodPolicyAdminPanel showMsg={showMsg} />
      )}

      {tab === 'school-menu' && (
        <SchoolMenuAdminPanel showMsg={showMsg} />
      )}
    </>
  )
}
