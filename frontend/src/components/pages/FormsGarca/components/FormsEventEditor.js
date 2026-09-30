import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListPlus,
  UploadCloud,
  Eye,
  SlidersHorizontal,
  AlertCircle,
  X
} from 'lucide-react'
import {
  createForm,
  updateForm,
  uploadFile,
} from '../../../../services/formsGarcaService'
import FormsEventHeader from './FormsEventHeader'
import FormsSectionCard from './FormsSectionCard'
import FormsContextPanel from './FormsContextPanel'
import FormsStickyActionBar from './FormsStickyActionBar'
import FormsEventSummary from './FormsEventSummary'
import FormsEventLivePreview from './FormsEventLivePreview'
import styles from './FormsEventEditor.module.css'

const FIELD_TYPES = [
  ['text', 'Texto Simples'],
  ['textarea', 'Texto Longo (Parágrafo)'],
  ['number', 'Número'],
  ['email', 'E-mail'],
  ['phone', 'Telefone / Celular'],
  ['cpf', 'CPF'],
  ['date', 'Data'],
  ['select', 'Seleção Única (Menu Dropdown)'],
  ['radio', 'Seleção Única (Múltipla Escolha)'],
  ['checkbox', 'Caixas de Seleção (Múltipla Escolha)'],
  ['file', 'Envio de Arquivo (Upload PDF/Imagem)'],
]

function localDate(date) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function errorOf(err) {
  return err?.response?.data?.message || err?.message || 'Falha ao processar solicitação.'
}

export default function FormsEventEditor({
  initial,
  currentStep = 'info',
  onStepChange,
  onCancel,
  onSaved,
  setError,
}) {
  // Estado canônico do formulário
  const [form, setForm] = useState(initial)
  const isEdit = Boolean(form._id)

  // Snapshot inicial para cálculo rigoroso de dirty state
  const [initialSnapshot, setInitialSnapshot] = useState(() => JSON.stringify(initial))

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== initialSnapshot
  }, [form, initialSnapshot])

  // Estados de submissão e upload
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Painel Contextual
  const [contextTab, setContextTab] = useState('summary') // 'summary' | 'preview'
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Diálogo de confirmação de saída com alterações não salvas
  const [showExitConfirm, setShowExitConfirm] = useState(false)


  // Listener de beforeunload apenas quando há alterações não salvas reais
  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Atualização genérica de campos de texto, select e checkboxes
  const update = ({ target }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value
    setForm((curr) => ({ ...curr, [target.name]: value }))
  }

  // Upload de Logotipo mantendo endpoints existentes
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

  // Upload de Banner mantendo endpoints existentes
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

  // Operações do Builder de Campos (preservadas funcionalmente até a Fase 5)
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

  // Cancelar alterações: restaura o último snapshot persistido
  const handleCancelChanges = () => {
    try {
      const restored = JSON.parse(initialSnapshot)
      setForm(restored)
    } catch {}
  }

  // Saída segura com proteção contra descarte acidental
  const handleAttemptExit = () => {
    if (isDirty) {
      setShowExitConfirm(true)
    } else if (onCancel) {
      onCancel()
    }
  }

  const handleConfirmExit = () => {
    setShowExitConfirm(false)
    if (onCancel) onCancel()
  }

  // Persistência canônica do formulário
  async function submit(e) {
    if (e) e.preventDefault()
    if (!form.titulo?.trim()) {
      if (setError) setError('O Título do evento é obrigatório. Por favor, preencha no Passo 1.')
      if (onStepChange) onStepChange('info')
      return
    }
    if (!form.dataEvento) {
      if (setError) setError('A Data do evento é obrigatória. Por favor, preencha no Passo 1.')
      if (onStepChange) onStepChange('info')
      return
    }
    setSaving(true)
    if (setError) setError('')
    try {
      const payload = {
        ...form,
        campos: (form.campos || []).map((f) => ({
          ...f,
          options: ['select', 'radio', 'checkbox'].includes(f.type) ? f.options : [],
        })),
      }
      let savedResult
      if (isEdit) {
        savedResult = await updateForm(form._id, payload)
      } else {
        savedResult = await createForm(payload)
      }
      // Atualiza snapshot para marcar limpo imediatamente após sucesso
      const newFormState = savedResult?.form || payload
      setForm(newFormState)
      setInitialSnapshot(JSON.stringify(newFormState))
      if (onSaved) await onSaved(newFormState)
    } catch (err) {
      if (setError) setError(errorOf(err))
    } finally {
      setSaving(false)
    }
  }

  // Prontidão de publicação
  const hasTitle = Boolean(form.titulo && form.titulo.trim())
  const hasDate = Boolean(form.dataEvento)
  const hasFields = Array.isArray(form.campos) && form.campos.length > 0
  const hasVisual = Boolean(form.logoUrl || form.bannerUrl)

  return (
    <div className={styles.editorWorkspace}>
      {/* 1. Event Header Integrado */}
      <FormsEventHeader
        event={isEdit ? form : { ...form, titulo: form.titulo || 'Novo formulário' }}
        onBack={handleAttemptExit}
      />

      <form className={styles.editorForm} onSubmit={submit}>
        <div className={styles.workspaceColumns}>
          {/* COLUNA PRINCIPAL: SEÇÕES DE CONFIGURAÇÃO (~68%) */}
          <main className={styles.mainColumn}>
            {/* SEÇÃO 1: INFORMAÇÕES */}
            <section id="sec-info">
              <FormsSectionCard
                title="Dados Básicos e Identificação"
                subtitle="Nome oficial, datas principais e modalidade do evento"
              >
                <div className={styles.grid}>
                  <label className={styles.formLabel}>
                    Título *
                    <input
                      name="titulo"
                      value={form.titulo || ''}
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
                      value={form.dataEvento || ''}
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
                    <select name="status" value={form.status || 'aberto'} onChange={update}>
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

                {/* Localização exibida quando relevante para a modalidade */}
                {form.tipoEvento !== 'online' && (
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
                        placeholder="Ex: Rua Barão do Rio Branco, 120"
                      />
                    </label>
                  </div>
                )}

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
            </section>

            {/* SEÇÃO 2: INSCRIÇÕES E REGRAS */}
            <section id="sec-rules">
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

                  <div className={styles.switchesGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        name="inscricoesAbertas"
                        type="checkbox"
                        checked={Boolean(form.inscricoesAbertas)}
                        onChange={update}
                      />
                      <span>Inscrições abertas imediatamente</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        name="permitirMultiplasInscricoes"
                        type="checkbox"
                        checked={Boolean(form.permitirMultiplasInscricoes)}
                        onChange={update}
                      />
                      <span>Permitir mais de uma inscrição pelo mesmo CPF</span>
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
                    placeholder="Mensagem impressa no voucher de confirmação do cidadão."
                  />
                </label>
              </FormsSectionCard>
            </section>

            {/* SEÇÃO 3: CAMPOS DO FORMULÁRIO (Preservado para a Fase 5) */}
            <section id="sec-fields">
              <FormsSectionCard
                title="Campos Personalizados do Formulário"
                subtitle="Configure as perguntas que os munícipes responderão ao se inscreverem"
                action={
                  <button type="button" className={styles.addBtn} onClick={addField}>
                    <Plus size={15} /> Adicionar campo
                  </button>
                }
              >
                {(form.campos || []).length === 0 ? (
                  <div className={styles.emptyState}>
                    <ListPlus size={36} className={styles.emptyIcon} />
                    <h4>Nenhum campo personalizado adicionado</h4>
                    <p>O formulário coletará por padrão Nome, E-mail, CPF e Telefone do usuário autenticado.</p>
                    <button type="button" className={styles.secondaryBtn} onClick={addField}>
                      <Plus size={14} /> Adicionar meu primeiro campo
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
                              aria-label="Mover campo para cima"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.orderBtn}
                              onClick={() => moveField(index, 1)}
                              disabled={index === form.campos.length - 1}
                              title="Mover para baixo"
                              aria-label="Mover campo para baixo"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>

                          <div className={styles.fieldDetails}>
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

                            <div className={styles.fieldOptionsRow}>
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
                                <span>Obrigatório</span>
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
            </section>

            {/* SEÇÃO 4: APARÊNCIA E WHITE LABEL */}
            <section id="sec-appearance">
              <FormsSectionCard
                title="Identidade Visual e White Label"
                subtitle="Personalize cores institucionais, logotipo e banner de divulgação do evento"
              >
                {uploadError && <div className={styles.errorAlert}>{uploadError}</div>}

                <div className={styles.grid}>
                  <label className={styles.formLabel}>
                    Cor Primária Institucional
                    <div className={styles.colorPickerWrapper}>
                      <input
                        type="color"
                        name="corPrimaria"
                        value={form.corPrimaria || '#1e3a8a'}
                        onChange={update}
                        className={styles.colorInput}
                        aria-label="Seletor de cor primária"
                      />
                      <input
                        type="text"
                        name="corPrimaria"
                        value={form.corPrimaria || '#1e3a8a'}
                        onChange={update}
                        placeholder="#1e3a8a"
                        className={styles.colorTextInput}
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
                  <div className={styles.uploadCard}>
                    <label className={styles.formLabel}>
                      Logotipo do Evento / Órgão
                      <input
                        name="logoUrl"
                        value={form.logoUrl || ''}
                        onChange={update}
                        placeholder="https://... ou faça upload abaixo"
                      />
                    </label>

                    <label className={styles.uploadBtn}>
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
                      <div className={styles.previewThumbRow}>
                        <img
                          src={form.logoUrl}
                          alt="Prévia do Logotipo"
                          className={styles.logoThumb}
                        />
                        <button
                          type="button"
                          className={styles.iconDanger}
                          onClick={() => setForm((c) => ({ ...c, logoUrl: '' }))}
                          title="Remover logotipo"
                          aria-label="Remover logotipo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BANNER */}
                  <div className={styles.uploadCard}>
                    <label className={styles.formLabel}>
                      Banner Superior de Divulgação
                      <input
                        name="bannerUrl"
                        value={form.bannerUrl || ''}
                        onChange={update}
                        placeholder="https://... ou faça upload abaixo"
                      />
                    </label>

                    <label className={styles.uploadBtn}>
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
                      <div className={styles.previewThumbRow}>
                        <img
                          src={form.bannerUrl}
                          alt="Prévia do Banner"
                          className={styles.bannerThumb}
                        />
                        <button
                          type="button"
                          className={styles.iconDanger}
                          onClick={() => setForm((c) => ({ ...c, bannerUrl: '' }))}
                          title="Remover banner"
                          aria-label="Remover banner"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </FormsSectionCard>
            </section>

            {/* SEÇÃO 5: CONFIGURAÇÕES AVANÇADAS & PUBLICAÇÃO */}
            <section id="sec-publish">
              <FormsSectionCard
                title="Revisão e Prontidão de Publicação"
                subtitle="Verifique o checklist dos dados antes de disponibilizar para a população"
                collapsible
                defaultCollapsed={false}
              >
                <div className={styles.checklistList}>
                  {/* Requisitos Obrigatórios */}
                  <div className={styles.checkItem}>
                    {hasTitle ? (
                      <CheckCircle2 size={18} color="#15803d" className={styles.checkIcon} />
                    ) : (
                      <XCircle size={18} color="#b91c1c" className={styles.checkIcon} />
                    )}
                    <div className={styles.checkDetails}>
                      <span>Título oficial do evento:</span>
                      <strong>{form.titulo || 'Pendente (obrigatório)'}</strong>
                    </div>
                    <span className={hasTitle ? styles.tagSuccess : styles.tagDanger}>
                      {hasTitle ? 'Obrigatório OK' : 'Obrigatório'}
                    </span>
                  </div>

                  <div className={styles.checkItem}>
                    {hasDate ? (
                      <CheckCircle2 size={18} color="#15803d" className={styles.checkIcon} />
                    ) : (
                      <XCircle size={18} color="#b91c1c" className={styles.checkIcon} />
                    )}
                    <div className={styles.checkDetails}>
                      <span>Data de realização:</span>
                      <strong>{localDate(form.dataEvento)}</strong>
                    </div>
                    <span className={hasDate ? styles.tagSuccess : styles.tagDanger}>
                      {hasDate ? 'Obrigatório OK' : 'Obrigatório'}
                    </span>
                  </div>

                  {/* Recomendações */}
                  <div className={styles.checkItem}>
                    <CheckCircle2 size={18} color={hasFields ? '#15803d' : '#f59e0b'} className={styles.checkIcon} />
                    <div className={styles.checkDetails}>
                      <span>Campos personalizados:</span>
                      <strong>{(form.campos || []).length} campo(s) configurado(s)</strong>
                    </div>
                    <span className={styles.tagInfo}>Recomendado</span>
                  </div>

                  <div className={styles.checkItem}>
                    <CheckCircle2 size={18} color={hasVisual ? '#15803d' : '#94a3b8'} className={styles.checkIcon} />
                    <div className={styles.checkDetails}>
                      <span>Identidade visual (Logo / Banner):</span>
                      <strong>{hasVisual ? 'Definida' : 'Padrão institucional'}</strong>
                    </div>
                    <span className={styles.tagInfo}>Recomendado</span>
                  </div>

                  {/* Informativos */}
                  <div className={styles.checkItem}>
                    <CheckCircle2 size={18} color="#15803d" className={styles.checkIcon} />
                    <div className={styles.checkDetails}>
                      <span>Limite de capacidade:</span>
                      <strong>{form.limiteInscricoes ? `${form.limiteInscricoes} vagas` : 'Ilimitado'}</strong>
                    </div>
                    <span className={styles.tagNeutral}>Informativo</span>
                  </div>

                  <div className={styles.checkItem}>
                    <CheckCircle2 size={18} color="#15803d" className={styles.checkIcon} />
                    <div className={styles.checkDetails}>
                      <span>Inscrições abertas imediatamente:</span>
                      <strong>{form.inscricoesAbertas ? 'Sim' : 'Não (abertura manual)'}</strong>
                    </div>
                    <span className={styles.tagNeutral}>Informativo</span>
                  </div>
                </div>
              </FormsSectionCard>
            </section>
          </main>

          {/* COLUNA LATERAL: PAINEL CONTEXTUAL STICKY (~32%) */}
          <aside className={styles.contextColumn}>
            <FormsContextPanel
              title="Visão Operacional"
              tabs={[
                { id: 'summary', label: 'Resumo' },
                { id: 'preview', label: 'Prévia' },
              ]}
              activeTab={contextTab}
              onTabChange={setContextTab}
            >
              {contextTab === 'summary' ? (
                <FormsEventSummary form={form} />
              ) : (
                <FormsEventLivePreview form={form} />
              )}
            </FormsContextPanel>
          </aside>
        </div>

        {/* 2. Botão Flutuante Mobile/Tablet para abrir o Painel Contextual */}
        <div className={styles.mobileFloatingActions}>
          <button
            type="button"
            className={styles.mobilePreviewBtn}
            onClick={() => {
              setContextTab('preview')
              setMobileDrawerOpen(true)
            }}
            aria-label="Abrir prévia do evento"
          >
            <Eye size={16} />
            <span>Ver Prévia</span>
          </button>
          <button
            type="button"
            className={styles.mobileSummaryBtn}
            onClick={() => {
              setContextTab('summary')
              setMobileDrawerOpen(true)
            }}
            aria-label="Abrir resumo operacional"
          >
            <SlidersHorizontal size={16} />
            <span>Resumo</span>
          </button>
        </div>

        {/* Modal / Drawer do Painel Contextual no Mobile */}
        {mobileDrawerOpen && (
          <div className={styles.mobileDrawerOverlay} role="dialog" aria-modal="true">
            <div className={styles.mobileDrawerContent}>
              <div className={styles.mobileDrawerHeader}>
                <div className={styles.drawerTabs}>
                  <button
                    type="button"
                    className={`${styles.drawerTab} ${contextTab === 'summary' ? styles.drawerTabActive : ''}`}
                    onClick={() => setContextTab('summary')}
                  >
                    Resumo
                  </button>
                  <button
                    type="button"
                    className={`${styles.drawerTab} ${contextTab === 'preview' ? styles.drawerTabActive : ''}`}
                    onClick={() => setContextTab('preview')}
                  >
                    Prévia
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.closeDrawerBtn}
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Fechar painel"
                >
                  <X size={18} />
                </button>
              </div>
              <div className={styles.mobileDrawerBody}>
                {contextTab === 'summary' ? (
                  <FormsEventSummary form={form} />
                ) : (
                  <FormsEventLivePreview form={form} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Sticky Action Bar com Dirty State rigoroso */}
        <FormsStickyActionBar
          hasUnsavedChanges={isDirty}
          unsavedMessage="Alterações não salvas"
          onCancel={isDirty ? handleCancelChanges : handleAttemptExit}
          cancelLabel={isDirty ? 'Descartar alterações' : 'Voltar aos eventos'}
          onSave={() => submit()}
          saveLabel="Salvar formulário"
          saving={saving}
          onPreview={() => {
            setContextTab('preview')
            setMobileDrawerOpen(true)
          }}
          previewLabel="Pré-visualizar"
        />
      </form>

      {/* 4. Diálogo de Proteção contra Perda de Alterações */}
      {showExitConfirm && (
        <div className={styles.confirmOverlay} role="alertdialog" aria-modal="true">
          <div className={styles.confirmBox}>
            <div className={styles.confirmHeader}>
              <AlertCircle size={22} className={styles.confirmIcon} />
              <h4>Existem alterações não salvas</h4>
            </div>
            <p className={styles.confirmText}>
              Você fez alterações que ainda não foram salvas no servidor. Se sair agora, todas as modificações recentes serão perdidas.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmStayBtn}
                onClick={() => setShowExitConfirm(false)}
              >
                Continuar editando
              </button>
              <button
                type="button"
                className={styles.confirmLeaveBtn}
                onClick={handleConfirmExit}
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
