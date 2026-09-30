import React from 'react'
import { Save, ArrowRight, Eye, RefreshCw } from 'lucide-react'
import styles from './FormsStickyActionBar.module.css'

export default function FormsStickyActionBar({
  hasUnsavedChanges = false,
  unsavedMessage = 'Alterações não salvas',
  onCancel,
  cancelLabel = 'Cancelar',
  onSaveDraft,
  saveDraftLabel = 'Salvar Rascunho',
  onPreview,
  previewLabel = 'Pré-visualizar',
  onSave,
  saveLabel = 'Salvar alterações',
  onNext,
  nextLabel = 'Salvar e continuar',
  saving = false,
  saveDisabled = false,
  secondaryActions,
  className = '',
}) {
  return (
    <div
      className={`${styles.actionBarWrapper} ${className}`}
      role="region"
      aria-label="Ações persistentes do formulário"
    >
      <div className={styles.inner}>
        <div className={styles.leftStatus}>
          {hasUnsavedChanges && (
            <div className={styles.unsavedBadge}>
              <span className={styles.unsavedDot} aria-hidden="true" />
              <span>{unsavedMessage}</span>
            </div>
          )}

          {secondaryActions}
        </div>

        <div className={styles.actionsGroup}>
          {onCancel && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onCancel}
              disabled={saving}
            >
              {cancelLabel}
            </button>
          )}

          {onSaveDraft && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onSaveDraft}
              disabled={saving || saveDisabled}
            >
              {saveDraftLabel}
            </button>
          )}

          {onPreview && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onPreview}
              disabled={saving}
            >
              <Eye size={15} aria-hidden="true" />
              <span>{previewLabel}</span>
            </button>
          )}

          {onSave && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onSave}
              disabled={saving || saveDisabled}
            >
              {saving ? (
                <>
                  <RefreshCw size={15} className="spin" aria-hidden="true" />
                  <span>Salvando…</span>
                </>
              ) : (
                <>
                  <Save size={15} aria-hidden="true" />
                  <span>{saveLabel}</span>
                </>
              )}
            </button>
          )}

          {onNext && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onNext}
              disabled={saving || saveDisabled}
            >
              <span>{nextLabel}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
