import React, { useRef } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import styles from './FormsFieldOptionsEditor.module.css'

export default function FormsFieldOptionsEditor({
  options = [],
  onChange,
  disabled = false,
}) {
  const lastInputRef = useRef(null)

  const handleOptionChange = (index, value) => {
    const updated = [...options]
    updated[index] = value
    onChange(updated)
  }

  const handleAddOption = () => {
    const newOptions = [...options, `Opção ${options.length + 1}`]
    onChange(newOptions)
    setTimeout(() => {
      if (lastInputRef.current) {
        lastInputRef.current.focus()
        lastInputRef.current.select()
      }
    }, 50)
  }

  const handleRemoveOption = (index) => {
    const updated = options.filter((_, idx) => idx !== index)
    onChange(updated)
  }

  const handleMoveOption = (index, direction) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= options.length) return
    const updated = [...options]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    onChange(updated)
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddOption()
    }
  }

  return (
    <div className={styles.optionsContainer}>
      <div className={styles.optionsHeader}>
        <span className={styles.optionsTitle}>Opções de Resposta</span>
        <button
          type="button"
          className={styles.addOptionBtn}
          onClick={handleAddOption}
          disabled={disabled}
        >
          <Plus size={14} />
          <span>Adicionar opção</span>
        </button>
      </div>

      {options.length === 0 ? (
        <div className={styles.emptyOptions}>
          <span>Nenhuma opção cadastrada. Adicione pelo menos uma opção.</span>
          <button
            type="button"
            className={styles.addFirstBtn}
            onClick={handleAddOption}
          >
            <Plus size={13} />
            <span>Criar primeira opção</span>
          </button>
        </div>
      ) : (
        <div className={styles.optionsList} role="list" aria-label="Lista de opções de resposta">
          {options.map((opt, index) => {
            const isLast = index === options.length - 1
            return (
              <div key={index} className={styles.optionRow} role="listitem">
                <span className={styles.optionGrip} aria-hidden="true">
                  <GripVertical size={14} />
                </span>

                <span className={styles.optionIndex}>{index + 1}.</span>

                <input
                  ref={isLast ? lastInputRef : null}
                  type="text"
                  className={styles.optionInput}
                  value={opt}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder={`Opção ${index + 1}`}
                  disabled={disabled}
                  aria-label={`Texto da opção ${index + 1}`}
                />

                <div className={styles.optionActions}>
                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => handleMoveOption(index, -1)}
                    disabled={disabled || index === 0}
                    title="Mover para cima"
                    aria-label={`Mover opção ${index + 1} para cima`}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    className={styles.moveBtn}
                    onClick={() => handleMoveOption(index, 1)}
                    disabled={disabled || index === options.length - 1}
                    title="Mover para baixo"
                    aria-label={`Mover opção ${index + 1} para baixo`}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemoveOption(index)}
                    disabled={disabled}
                    title="Remover opção"
                    aria-label={`Remover opção ${index + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <small className={styles.shortcutHint}>
        Dica: pressione <strong>Enter</strong> no campo da opção para adicionar rapidamente a próxima.
      </small>
    </div>
  )
}
