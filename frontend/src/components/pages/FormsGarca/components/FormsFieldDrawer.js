import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react'
import FormsFieldTypePicker, { FIELD_TYPE_LABELS } from './FormsFieldTypePicker'
import FormsFieldOptionsEditor from './FormsFieldOptionsEditor'
import styles from './FormsFieldDrawer.module.css'

export default function FormsFieldDrawer({
  isOpen,
  field,
  isNew = false,
  onApply,
  onCancel,
  onDraftChange,
}) {
  const [draftField, setDraftField] = useState(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const drawerRef = useRef(null)
  const labelInputRef = useRef(null)
  const firstFocusableRef = useRef(null)

  // Atualiza draft local
  const updateDraft = (updater) => {
    setDraftField((curr) => {
      return typeof updater === 'function' ? updater(curr) : { ...curr, ...updater }
    })
  }

  // Notifica o componente pai sobre mudanças no draft para live preview e auto-commit seguro
  useEffect(() => {
    if (isOpen && draftField && onDraftChange) {
      onDraftChange(draftField)
    }
  }, [isOpen, draftField, onDraftChange])

  // Sincroniza draft local ao abrir ou receber novo campo
  useEffect(() => {
    if (isOpen && field) {
      const initial = {
        id: field.id || field.fieldId || `campo_${Date.now()}`,
        fieldId: field.fieldId || field.id || `campo_${Date.now()}`,
        label: field.label || '',
        type: field.type || 'text',
        required: Boolean(field.required),
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        options: Array.isArray(field.options) ? [...field.options] : [],
        // Preserva quaisquer propriedades customizadas existentes de campos legados
        ...field,
      }
      setDraftField(initial)
      setShowTypePicker(isNew)
      setErrorMsg('')
    } else {
      setDraftField(null)
      setShowTypePicker(false)
      setErrorMsg('')
    }
  }, [isOpen, field, isNew])

  const handleCancel = useCallback(() => {
    if (onDraftChange) onDraftChange(null)
    if (onCancel) onCancel()
  }, [onCancel, onDraftChange])

  // Foco inicial e tecla Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      } else if (e.key === 'Tab') {
        // Trap de foco no drawer
        if (!drawerRef.current) return
        const focusables = drawerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          last.focus()
          e.preventDefault()
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus()
          e.preventDefault()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Foco inicial no campo de rótulo após abertura
    const timer = setTimeout(() => {
      if (labelInputRef.current) {
        labelInputRef.current.focus()
      } else if (firstFocusableRef.current) {
        firstFocusableRef.current.focus()
      }
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [isOpen, handleCancel])

  if (!isOpen || !draftField) return null

  const handleTypeChange = (newType) => {
    updateDraft((curr) => {
      const isChoice = ['select', 'radio', 'checkbox'].includes(newType)
      const currentHasOptions = Array.isArray(curr.options) && curr.options.length > 0
      return {
        ...curr,
        type: newType,
        options: isChoice
          ? currentHasOptions
            ? curr.options
            : ['Opção 1', 'Opção 2']
          : curr.options,
      }
    })
    setShowTypePicker(false)
  }

  const handleApply = (e) => {
    if (e) e.preventDefault()
    if (!draftField.label || !draftField.label.trim()) {
      setErrorMsg('O rótulo do campo é obrigatório.')
      if (labelInputRef.current) labelInputRef.current.focus()
      return
    }

    if (['select', 'radio', 'checkbox'].includes(draftField.type)) {
      const validOptions = (draftField.options || []).filter(
        (o) => typeof o === 'string' && o.trim() !== ''
      )
      if (validOptions.length === 0) {
        setErrorMsg('Campos de escolha precisam de pelo menos uma opção cadastrada.')
        return
      }
    }

    setErrorMsg('')
    onApply && onApply(draftField)
  }

  const isChoiceType = ['select', 'radio', 'checkbox'].includes(draftField.type)
  const isInputLikeType = [
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'cpf',
    'date',
  ].includes(draftField.type)

  return (
    <div className={styles.overlay} onClick={handleCancel} role="presentation">
      <div
        className={styles.drawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-field-title"
        ref={drawerRef}
      >
        {/* CABEÇALHO DO DRAWER */}
        <div className={styles.header}>
          <div>
            <h3 id="drawer-field-title" className={styles.title}>
              {isNew ? 'Adicionar Campo' : 'Editar Campo'}
            </h3>
            <div className={styles.typeBadgeRow}>
              <span className={styles.typeBadge}>
                {FIELD_TYPE_LABELS[draftField.type] || draftField.type}
              </span>
              <button
                type="button"
                className={styles.switchTypeBtn}
                onClick={() => setShowTypePicker((v) => !v)}
                aria-expanded={showTypePicker}
              >
                <span>{showTypePicker ? 'Recolher tipos' : 'Alterar tipo'}</span>
                {showTypePicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleCancel}
            aria-label="Fechar painel de edição do campo"
            ref={firstFocusableRef}
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO */}
        <div className={styles.body}>
          {errorMsg && (
            <div className={styles.errorAlert} role="alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SELETOR DE TIPOS EM CATEGORIAS */}
          {showTypePicker && (
            <div className={styles.pickerSection}>
              <div className={styles.pickerTitle}>Selecione o tipo do campo:</div>
              <FormsFieldTypePicker
                selectedType={draftField.type}
                onSelectType={handleTypeChange}
                compact
              />
            </div>
          )}

          {/* RÓTULO DO CAMPO */}
          <div className={styles.formGroup}>
            <label htmlFor="drawer-field-label" className={styles.label}>
              Rótulo *
            </label>
            <input
              id="drawer-field-label"
              name="label"
              aria-label="Rótulo"
              ref={labelInputRef}
              type="text"
              className={styles.input}
              value={draftField.label || ''}
              onChange={(e) => {
                updateDraft({ label: e.target.value })
                if (errorMsg) setErrorMsg('')
              }}
              placeholder="Ex: Nome da Escola, Tamanho da Camiseta, etc."
              required
            />
            <span className={styles.helpText}>
              Este é o título da pergunta exibido para o munícipe.
            </span>
          </div>

          {/* OBRIGATORIEDADE */}
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="required"
                checked={Boolean(draftField.required)}
                onChange={(e) => updateDraft({ required: e.target.checked })}
              />
              <span className={styles.checkboxText}>
                Resposta obrigatória para prosseguir
              </span>
            </label>
          </div>

          {/* PLACEHOLDER */}
          {isInputLikeType && (
            <div className={styles.formGroup}>
              <label htmlFor="drawer-field-placeholder" className={styles.label}>
                Texto de Exemplo (Placeholder)
              </label>
              <input
                id="drawer-field-placeholder"
                name="placeholder"
                type="text"
                className={styles.input}
                value={draftField.placeholder || ''}
                onChange={(e) => updateDraft({ placeholder: e.target.value })}
                placeholder="Ex: Digite aqui..."
              />
            </div>
          )}

          {/* TEXTO DE AJUDA / INSTRUÇÕES */}
          <div className={styles.formGroup}>
            <label htmlFor="drawer-field-help" className={styles.label}>
              Orientações Adicionais (opcional)
            </label>
            <input
              id="drawer-field-help"
              name="helpText"
              type="text"
              className={styles.input}
              value={draftField.helpText || ''}
              onChange={(e) => updateDraft({ helpText: e.target.value })}
              placeholder="Texto explicativo exibido logo abaixo da pergunta"
            />
          </div>

          {/* EDITOR ESPECÍFICO DE OPÇÕES (SELECT, RADIO, CHECKBOX) */}
          {isChoiceType && (
            <div className={styles.optionsSection}>
              <FormsFieldOptionsEditor
                options={draftField.options || []}
                onChange={(newOptions) => updateDraft({ options: newOptions })}
              />
            </div>
          )}

          {/* INFORMAÇÃO ESPECÍFICA PARA UPLOAD */}
          {draftField.type === 'file' && (
            <div className={styles.infoBox}>
              <strong>Upload de Documentos</strong>
              <p>
                Os participantes poderão anexar um arquivo diretamente na página pública de
                inscrição. O link seguro do arquivo ficará disponível na lista de inscrições e no
                painel do evento.
              </p>
            </div>
          )}

          {/* INFORMAÇÃO ESPECÍFICA PARA TERMOS */}
          {draftField.type === 'terms' && (
            <div className={styles.infoBox}>
              <strong>Aceite de Termos e Condições</strong>
              <p>
                O rótulo acima será exibido como texto de consentimento ou regulamento ao lado de
                uma caixa de seleção. Se configurado como obrigatório, o munícipe só conseguirá
                concluir a inscrição após aceitar os termos.
              </p>
            </div>
          )}
        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.applyBtn}
            onClick={handleApply}
          >
            <Check size={16} />
            Aplicar alterações
          </button>
        </div>
      </div>
    </div>
  )
}
