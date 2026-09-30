import React from 'react'
import { X } from 'lucide-react'
import styles from './FormsContextPanel.module.css'

export default function FormsContextPanel({
  title = 'Painel Contextual',
  tabs = [],
  activeTab = '',
  onTabChange,
  children,
  onClose,
  className = '',
}) {
  return (
    <aside className={`${styles.contextPanel} ${className}`} aria-label={title}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h4 className={styles.title}>{title}</h4>
        </div>

        {tabs && tabs.length > 0 && (
          <div className={styles.tabs} role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                  onClick={() => onTabChange && onTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {onClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar painel contextual"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.body}>{children}</div>
    </aside>
  )
}
