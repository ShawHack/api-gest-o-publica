import React from 'react'
import {
  Layers,
  SlidersHorizontal,
  FileText,
  CalendarCheck,
  ListPlus,
  Palette,
  Users,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet
} from 'lucide-react'
import styles from './FormsSidebar.module.css'

export default function FormsSidebar({
  activeSection = 'events',
  onSelectSection,
  activeEvent = null,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) {
  const isEventActive = Boolean(activeEvent?._id)

  const handleItemClick = (sectionId) => {
    if (onSelectSection) onSelectSection(sectionId)
    if (mobileOpen && onCloseMobile) onCloseMobile()
  }

  return (
    <>
      {mobileOpen && (
        <div
          className={styles.backdrop}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} ${
          mobileOpen ? styles.sidebarOpenMobile : ''
        }`}
        aria-label="Navegação administrativa do SEMIT Forms"
      >
        {/* Cabeçalho da Sidebar */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.brandLogo} title="Forms Garça — SEMIT">
              <FileSpreadsheet size={19} aria-hidden="true" />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>Forms Garça</span>
              <span className={styles.brandSubtitle}>Gestão Pública</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeMobileBtn}
            onClick={onCloseMobile}
            aria-label="Fechar menu lateral"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegação */}
        <nav className={styles.navContainer}>
          {/* Seção GLOBAL */}
          <div className={styles.sectionGroup}>
            <span className={styles.sectionHeader}>Visão Geral</span>
            <button
              type="button"
              className={`${styles.navItem} ${
                activeSection === 'events' ? styles.navItemActive : ''
              }`}
              onClick={() => handleItemClick('events')}
              title="Meus Eventos e Formulários"
              aria-current={activeSection === 'events' ? 'page' : undefined}
            >
              <span className={styles.navIcon}>
                <Layers size={18} aria-hidden="true" />
              </span>
              <span className={styles.navLabel}>Meus Eventos</span>
            </button>
          </div>

          {/* Seção DO EVENTO SELECIONADO */}
          {isEventActive && (
            <div className={styles.sectionGroup}>
              <span className={styles.sectionHeader}>Evento em Gestão</span>
              <div className={styles.eventCardPreview} title={activeEvent.titulo}>
                <span className={styles.eventCardLabel}>Ativo</span>
                <span className={styles.eventCardTitle}>{activeEvent.titulo}</span>
              </div>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'dashboard' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('dashboard')}
                title="Painel e Métricas do Evento"
                aria-current={activeSection === 'dashboard' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <SlidersHorizontal size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Visão Geral</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'info' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('info')}
                title="Informações Gerais e Local"
                aria-current={activeSection === 'info' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <FileText size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Informações</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'rules' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('rules')}
                title="Regras, Prazos e Vagas de Inscrição"
                aria-current={activeSection === 'rules' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <CalendarCheck size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Inscrições & Regras</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'fields' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('fields')}
                title="Construtor de Campos do Formulário"
                aria-current={activeSection === 'fields' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <ListPlus size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Campos do Formulário</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'appearance' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('appearance')}
                title="Identidade Visual, Logo e Banner"
                aria-current={activeSection === 'appearance' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <Palette size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Aparência</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'responses' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('responses')}
                title="Gerenciar Inscritos e Vouchers"
                aria-current={activeSection === 'responses' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <Users size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Inscritos</span>
              </button>

              <button
                type="button"
                className={`${styles.navItem} ${
                  activeSection === 'publish' ? styles.navItemActive : ''
                }`}
                onClick={() => handleItemClick('publish')}
                title="Publicação, Checklist e Divulgação"
                aria-current={activeSection === 'publish' ? 'page' : undefined}
              >
                <span className={styles.navIcon}>
                  <Send size={18} aria-hidden="true" />
                </span>
                <span className={styles.navLabel}>Publicação</span>
              </button>
            </div>
          )}
        </nav>

        {/* Rodapé / Alternância de Colapso */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{collapsed ? '' : 'Recolher menu'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
