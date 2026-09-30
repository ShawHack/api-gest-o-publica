import React, { useState, useRef, useEffect } from 'react'
import {
  Plus,
  GripVertical,
  MoreVertical,
  Edit3,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertTriangle,
  ListPlus,
} from 'lucide-react'
import FormsSectionCard from './FormsSectionCard'
import FormsFieldDrawer from './FormsFieldDrawer'
import { FIELD_TYPE_LABELS } from './FormsFieldTypePicker'
import styles from './FormsFieldsBuilder.module.css'

export function generateFieldId(prefix = 'campo') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

export default function FormsFieldsBuilder({
  campos = [],
  onChange,
  onDraftChange,
  eventInscriptionsCount = 0,
}) {
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    field: null,
    index: null,
    isNew: false,
  })

  // Estado para menu contextual aberto (índice do campo)
  const [openMenuIndex, setOpenMenuIndex] = useState(null)

  // Estado para modal de confirmação de exclusão
  const [fieldToDelete, setFieldToDelete] = useState(null)

  // Estado para HTML5 Drag and Drop
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const menuRef = useRef(null)

  // Fecha menu contextual ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuIndex(null)
      }
    }
    if (openMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuIndex])

  // Normalização de campos para compatibilidade retroativa
  const normalizedFields = (campos || []).map((f, idx) => ({
    id: f.id || f.fieldId || `campo_${idx}`,
    fieldId: f.fieldId || f.id || `campo_${idx}`,
    label: f.label ?? '',
    type: f.type || 'text',
    required: Boolean(f.required),
    placeholder: f.placeholder || '',
    helpText: f.helpText || '',
    options: Array.isArray(f.options) ? f.options : [],
    ...f,
  }))

  // Abertura para novo campo com ID canônico estável
  const handleAddNewField = () => {
    const newId = generateFieldId()
    const initialNewField = {
      id: newId,
      fieldId: newId,
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
      options: [],
    }
    setDrawerState({
      isOpen: true,
      field: initialNewField,
      index: null,
      isNew: true,
    })
    if (onDraftChange) onDraftChange(initialNewField)
  }

  // Abertura para edição
  const handleEditField = (index) => {
    const target = normalizedFields[index]
    if (!target) return
    setDrawerState({
      isOpen: true,
      field: { ...target },
      index,
      isNew: false,
    })
    setOpenMenuIndex(null)
    if (onDraftChange) onDraftChange(target)
  }

  // Aplicação das alterações do Drawer ao estado canônico local
  const handleApplyDrawer = (appliedField) => {
    const updated = [...normalizedFields]
    if (drawerState.isNew || drawerState.index === null) {
      updated.push(appliedField)
    } else {
      updated[drawerState.index] = {
        ...updated[drawerState.index],
        ...appliedField,
      }
    }
    setDrawerState({ isOpen: false, field: null, index: null, isNew: false })
    if (onDraftChange) onDraftChange(null)
    if (onChange) onChange(updated)
  }

  // Cancelamento do Drawer (descarta draft sem sujar estado)
  const handleCancelDrawer = () => {
    setDrawerState({ isOpen: false, field: null, index: null, isNew: false })
    if (onDraftChange) onDraftChange(null)
  }

  // Duplicar campo
  const handleDuplicateField = (index) => {
    const original = normalizedFields[index]
    if (!original) return
    const newId = generateFieldId()
    const duplicated = {
      ...original,
      id: newId,
      fieldId: newId,
      label: original.label ? `${original.label} — cópia` : 'Novo campo — cópia',
      options: Array.isArray(original.options) ? [...original.options] : [],
    }
    const updated = [...normalizedFields]
    updated.splice(index + 1, 0, duplicated)
    setOpenMenuIndex(null)
    if (onChange) onChange(updated)
  }

  // Mover campo (reordenação acessível via botões)
  const handleMoveField = (index, delta) => {
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= normalizedFields.length) return
    const updated = [...normalizedFields]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setOpenMenuIndex(null)
    if (onChange) onChange(updated)
  }

  // Excluir campo
  const handleConfirmDelete = () => {
    if (!fieldToDelete) return
    const updated = normalizedFields.filter((_, idx) => idx !== fieldToDelete.index)
    setFieldToDelete(null)
    setOpenMenuIndex(null)
    if (onChange) onChange(updated)
  }

  // Drag and Drop (HTML5)
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    const sourceIdx = draggedIndex !== null ? draggedIndex : Number(e.dataTransfer.getData('text/plain'))
    if (sourceIdx === targetIndex || isNaN(sourceIdx)) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    const updated = [...normalizedFields]
    const [moved] = updated.splice(sourceIdx, 1)
    updated.splice(targetIndex, 0, moved)
    setDraggedIndex(null)
    setDragOverIndex(null)
    if (onChange) onChange(updated)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <section id="sec-fields" className={styles.wrapper}>
      <FormsSectionCard
        title="Campos Personalizados do Formulário"
        subtitle="Configure as perguntas que os munícipes responderão ao se inscreverem"
        action={
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddNewField}
            aria-label="Adicionar campo ao formulário"
          >
            <Plus size={16} />
            <span>Adicionar campo</span>
          </button>
        }
      >
        {normalizedFields.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconCircle}>
              <ListPlus size={32} />
            </div>
            <h4 className={styles.emptyTitle}>Nenhum campo personalizado adicionado</h4>
            <p className={styles.emptyText}>
              Adicione os campos que o participante deverá preencher durante a inscrição.
            </p>
            <button
              type="button"
              className={styles.emptyAddBtn}
              onClick={handleAddNewField}
              aria-label="Adicionar primeiro campo"
            >
              <Plus size={15} />
              <span>Adicionar primeiro campo</span>
            </button>
          </div>
        ) : (
          <div className={styles.fieldList} role="list" aria-label="Lista de campos do formulário">
            {normalizedFields.map((field, index) => {
              const isChoice = ['select', 'radio', 'checkbox'].includes(field.type)
              const optionsCount = (field.options || []).length
              const isBeingDragged = draggedIndex === index
              const isDropTarget = dragOverIndex === index && draggedIndex !== index

              return (
                <div
                  key={field.id || field.fieldId || index}
                  className={`${styles.fieldCard} ${isBeingDragged ? styles.dragging : ''} ${
                    isDropTarget ? styles.dropTarget : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  role="listitem"
                >
                  {/* HANDLE DE ORDENAÇÃO */}
                  <div
                    className={styles.dragHandle}
                    title="Arraste para reordenar"
                    aria-label="Arraste para reordenar campo"
                  >
                    <GripVertical size={18} />
                  </div>

                  {/* IDENTIFICAÇÃO E DADOS PRINCIPAIS */}
                  <div className={styles.fieldMainInfo} onClick={() => handleEditField(index)}>
                    <div className={styles.fieldHeaderLine}>
                      <span className={styles.fieldLabelText}>
                        {field.label ? field.label : <em>(Campo sem rótulo)</em>}
                      </span>
                    </div>

                    <div className={styles.fieldBadges}>
                      <span className={styles.typeBadge}>
                        {FIELD_TYPE_LABELS[field.type] || field.type}
                      </span>

                      {field.required ? (
                        <span className={styles.reqBadge}>Obrigatório</span>
                      ) : (
                        <span className={styles.optBadge}>Opcional</span>
                      )}

                      {isChoice && (
                        <span className={styles.optionsBadge}>
                          {optionsCount} {optionsCount === 1 ? 'opção' : 'opções'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AÇÕES COMPACTAS */}
                  <div className={styles.fieldActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => handleEditField(index)}
                      aria-label={`Editar campo ${field.label || index + 1}`}
                    >
                      <Edit3 size={15} />
                      <span className={styles.btnText}>Editar</span>
                    </button>

                    <div className={styles.menuContainer}>
                      <button
                        type="button"
                        className={styles.moreBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuIndex(openMenuIndex === index ? null : index)
                        }}
                        aria-label={`Mais opções para campo ${field.label || index + 1}`}
                        aria-expanded={openMenuIndex === index}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuIndex === index && (
                        <div className={styles.dropdownMenu} ref={menuRef} role="menu">
                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => handleEditField(index)}
                            role="menuitem"
                          >
                            <Edit3 size={14} />
                            <span>Editar propriedades</span>
                          </button>

                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => handleDuplicateField(index)}
                            role="menuitem"
                          >
                            <Copy size={14} />
                            <span>Duplicar campo</span>
                          </button>

                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => handleMoveField(index, -1)}
                            disabled={index === 0}
                            role="menuitem"
                          >
                            <ArrowUp size={14} />
                            <span>Mover para cima</span>
                          </button>

                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => handleMoveField(index, 1)}
                            disabled={index === normalizedFields.length - 1}
                            role="menuitem"
                          >
                            <ArrowDown size={14} />
                            <span>Mover para baixo</span>
                          </button>

                          <div className={styles.menuDivider} />

                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={() => {
                              setFieldToDelete({ field, index })
                              setOpenMenuIndex(null)
                            }}
                            role="menuitem"
                          >
                            <Trash2 size={14} />
                            <span>Excluir campo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </FormsSectionCard>

      {/* DRAWER LATERAL / MODAL PARA EDIÇÃO DO CAMPO */}
      <FormsFieldDrawer
        isOpen={drawerState.isOpen}
        field={drawerState.field}
        isNew={drawerState.isNew}
        onApply={handleApplyDrawer}
        onCancel={handleCancelDrawer}
        onDraftChange={onDraftChange}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {fieldToDelete && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className={styles.confirmModal}>
            <div className={styles.confirmHeader}>
              <div className={styles.confirmWarningIcon}>
                <AlertTriangle size={22} />
              </div>
              <h4 id="delete-dialog-title" className={styles.confirmTitle}>
                Excluir campo?
              </h4>
            </div>

            <p className={styles.confirmMessage}>
              Tem certeza que deseja remover o campo{' '}
              <strong>"{fieldToDelete.field.label || 'sem rótulo'}"</strong>?
            </p>

            {eventInscriptionsCount > 0 && (
              <div className={styles.inscriptionWarningBox}>
                <strong>Atenção:</strong> Este evento possui {eventInscriptionsCount} inscrição(ões)
                registrada(s). Respostas anteriores a este campo serão mantidas no histórico de
                respostas, mas ele deixará de constar nas novas inscrições e relatórios padrão.
              </div>
            )}

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setFieldToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleConfirmDelete}
              >
                Excluir campo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
