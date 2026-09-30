import React, { useState } from 'react'
import { Menu, FileSpreadsheet } from 'lucide-react'
import FormsSidebar from './FormsSidebar'
import FormsEventHeader from './FormsEventHeader'
import styles from './FormsAppShell.module.css'

export default function FormsAppShell({
  activeSection = 'events',
  onSelectSection,
  activeEvent = null,
  onBackToEvents,
  children,
  contextPanel,
  actionBar,
  className = '',
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapse = () => setCollapsed((prev) => !prev)
  const openMobile = () => setMobileOpen(true)
  const closeMobile = () => setMobileOpen(false)

  return (
    <div className={`${styles.shellRoot} ${className}`}>
      {/* Sidebar Administrativa */}
      <FormsSidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        activeEvent={activeEvent}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Área Principal de Conteúdo */}
      <div
        className={`${styles.mainWrapper} ${
          collapsed ? styles.mainWrapperCollapsed : ''
        }`}
      >
        {/* Top bar visível em dispositivos móveis e tablets */}
        <div className={styles.mobileTopBar}>
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={openMobile}
            aria-label="Abrir menu de navegação"
          >
            <Menu size={20} />
          </button>

          <div className={styles.mobileBrand}>
            <FileSpreadsheet size={18} aria-hidden="true" />
            <span>Forms Garça</span>
          </div>

          <div style={{ width: 36 }} />
        </div>

        {/* Cabeçalho contextual do evento ativo */}
        {activeEvent && (
          <FormsEventHeader
            event={activeEvent}
            onBack={onBackToEvents}
          />
        )}

        {/* Conteúdo da Página com suporte a Painel Contextual */}
        <main className={styles.pageContent}>
          {contextPanel ? (
            <div className={styles.workspaceTwoColumns}>
              <div className={styles.mainColumn}>{children}</div>
              <div className={styles.contextColumn}>{contextPanel}</div>
            </div>
          ) : (
            <div className={styles.workspaceSingleColumn}>{children}</div>
          )}
        </main>

        {/* Action Bar Sticky no rodapé */}
        {actionBar}
      </div>
    </div>
  )
}
