import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  Calendar,
  MapPin,
  Users,
  MoreVertical,
  SlidersHorizontal,
  Pencil,
  CopyPlus,
  Send,
  Archive,
  Trash2,
  Layers,
  SearchX,
  X,
  AlertCircle
} from 'lucide-react'
import FormsPageHeader from './FormsPageHeader'
import FormsStatusBadge from './FormsStatusBadge'
import styles from './FormsEventsList.module.css'

function formatDate(date) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export default function FormsEventsList({
  forms = [],
  statistics = {},
  loading = false,
  searchQuery = '',
  setSearchQuery,
  statusFilter = 'todos',
  setStatusFilter,
  onSearch,
  onRefresh,
  onCreate,
  onManage,
  onDashboard,
  onEdit,
  onResponses,
  onDuplicate,
  onPublish,
  onArchive,
  onDelete,
  error,
  onRetry,
}) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  // Fecha o menu de ações ao clicar fora ou pressionar Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

  const toggleMenu = (id) => {
    setOpenMenuId((curr) => (curr === id ? null : id))
  }

  const handleClearFilters = () => {
    if (setSearchQuery) setSearchQuery('')
    if (setStatusFilter) setStatusFilter('todos')
  }

  const handlePrimaryManage = (form) => {
    if (onManage) {
      onManage(form)
    } else if (onDashboard) {
      onDashboard(form)
    } else if (onEdit) {
      onEdit(form)
    }
  }

  const isFiltered = statusFilter !== 'todos' || Boolean(searchQuery && searchQuery.trim())

  return (
    <div className={styles.container}>
      {/* 1. PAGE HEADER PADRONIZADO COM CTA PRIMÁRIO */}
      <FormsPageHeader
        eyebrow="Prefeitura Municipal de Garça"
        title="Meus Eventos"
        description="Crie, publique e acompanhe seus formulários e processos de inscrição."
        actions={
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onCreate}
            aria-label="Novo"
            title="Novo evento"
          >
            <Plus size={16} aria-hidden="true" />
            <span>Novo evento</span>
          </button>
        }
      />

      {/* 2. RESUMO OPERACIONAL COMPACTO (FITA SUPERIOR) */}
      <div className={styles.summaryBar} role="region" aria-label="Resumo operacional de eventos">
        <button
          type="button"
          className={styles.summaryItem}
          onClick={() => setStatusFilter && setStatusFilter('todos')}
          title="Ver todos os eventos"
        >
          <span className={styles.summaryDot} style={{ backgroundColor: '#64748b' }} />
          <span>Total:</span>
          <span className={styles.summaryCount}>{statistics.total || forms.length || 0}</span>
        </button>

        <span className={styles.summaryDivider} aria-hidden="true" />

        <button
          type="button"
          className={styles.summaryItem}
          onClick={() => setStatusFilter && setStatusFilter('aberto')}
          title="Filtrar por eventos abertos"
        >
          <span className={styles.summaryDot} style={{ backgroundColor: '#15803d' }} />
          <span>Abertos:</span>
          <span className={styles.summaryCount}>{statistics.aberto || 0}</span>
        </button>

        <span className={styles.summaryDivider} aria-hidden="true" />

        <button
          type="button"
          className={styles.summaryItem}
          onClick={() => setStatusFilter && setStatusFilter('rascunho')}
          title="Filtrar por rascunhos"
        >
          <span className={styles.summaryDot} style={{ backgroundColor: '#94a3b8' }} />
          <span>Rascunhos:</span>
          <span className={styles.summaryCount}>{statistics.rascunho || 0}</span>
        </button>

        <span className={styles.summaryDivider} aria-hidden="true" />

        <button
          type="button"
          className={styles.summaryItem}
          onClick={() => setStatusFilter && setStatusFilter('concluido')}
          title="Filtrar por eventos concluídos"
        >
          <span className={styles.summaryDot} style={{ backgroundColor: '#6d28d9' }} />
          <span>Concluídos:</span>
          <span className={styles.summaryCount}>{statistics.concluido || 0}</span>
        </button>
      </div>

      {/* 3. TOOLBAR DE BUSCA E FILTROS */}
      <div className={styles.toolbar}>
        <form onSubmit={onSearch} className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            aria-label="Buscar eventos por título ou organizador"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery && setSearchQuery('')}
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </form>

        <div className={styles.filtersGroup} role="group" aria-label="Filtro por status">
          {[
            ['todos', `Todos (${statistics.total || forms.length || 0})`],
            ['aberto', `Abertos (${statistics.aberto || 0})`],
            ['rascunho', `Rascunhos (${statistics.rascunho || 0})`],
            ['emAndamento', `Em andamento (${statistics.emAndamento || 0})`],
            ['concluido', `Concluídos (${statistics.concluido || 0})`],
            ['arquivado', `Arquivados (${statistics.arquivado || 0})`],
          ].map(([val, label]) => {
            const isActive = statusFilter === val
            return (
              <button
                key={val}
                type="button"
                className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
                onClick={() => setStatusFilter && setStatusFilter(val)}
                aria-pressed={isActive}
              >
                {label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefresh}
          title="Atualizar lista de eventos"
          aria-label="Atualizar lista de eventos"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* 4. ESTADOS ESPECIAIS & LISTAGEM */}
      {error && (
        <div className={styles.emptyState} style={{ borderColor: '#fca5a5' }} role="alert">
          <AlertCircle size={36} color="#b91c1c" />
          <h3 className={styles.emptyTitle}>Erro ao carregar eventos</h3>
          <p className={styles.emptyText}>{error}</p>
          {onRetry && (
            <button type="button" className={styles.clearFiltersBtn} onClick={onRetry}>
              <RefreshCw size={14} /> Tentar novamente
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState} aria-busy="true" aria-label="Carregando eventos">
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : forms.length === 0 ? (
        isFiltered ? (
          /* Busca sem resultados */
          <div className={styles.emptyState}>
            <SearchX size={44} className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum evento encontrado para os filtros selecionados</h3>
            <p className={styles.emptyText}>
              Nenhum evento corresponde aos critérios de pesquisa informados. Tente ajustar o termo ou o status.
            </p>
            <button type="button" className={styles.clearFiltersBtn} onClick={handleClearFilters}>
              Limpar filtros
            </button>
          </div>
        ) : (
          /* Lista completamente vazia */
          <div className={styles.emptyState}>
            <Layers size={48} className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum evento criado</h3>
            <p className={styles.emptyText}>
              Você ainda não possui nenhum formulário ou evento cadastrado na plataforma.
            </p>
            <button type="button" className={styles.primaryBtn} onClick={onCreate}>
              <Plus size={16} />
              <span>Criar primeiro evento</span>
            </button>
          </div>
        )
      ) : (
        /* Listagem Estruturada de Alta Densidade */
        <div className={styles.eventsList} role="list" aria-label="Lista de eventos">
          {forms.map((form) => {
            const isMenuOpen = openMenuId === form._id
            const ocupadas = form.vagasOcupadas || 0
            const limite = form.limiteInscricoes ? Number(form.limiteInscricoes) : null
            const occupancyPct = limite ? Math.min(100, Math.round((ocupadas / limite) * 100)) : null

            return (
              <article
                key={form._id}
                className={styles.eventRow}
                role="listitem"
              >
                {/* Coluna 1: Identidade */}
                <div className={styles.identityCol}>
                  <div className={styles.badgesRow}>
                    <FormsStatusBadge status={form.status} size="sm" />
                    {form.publicado && (
                      <FormsStatusBadge status="publicado" size="sm" label="Publicado" />
                    )}
                  </div>
                  <h3 className={styles.eventTitle} title={form.titulo}>
                    {form.titulo || 'Evento sem título'}
                  </h3>
                  {form.subtitulo && (
                    <p className={styles.eventSubtitle} title={form.subtitulo}>
                      {form.subtitulo}
                    </p>
                  )}
                </div>

                {/* Coluna 2: Período e Local */}
                <div className={styles.detailsCol}>
                  <div className={styles.metaItem}>
                    <Calendar size={13} aria-hidden="true" />
                    <span>
                      Data: <strong>{formatDate(form.dataEvento)}</strong>
                      {form.dataFim && ` até ${formatDate(form.dataFim)}`}
                    </span>
                  </div>
                  {form.local && (
                    <div className={styles.metaItem} title={form.local}>
                      <MapPin size={13} aria-hidden="true" />
                      <span>{form.local}</span>
                    </div>
                  )}
                </div>

                {/* Coluna 3: Inscrições & Capacidade */}
                <div className={styles.capacityCol}>
                  <div className={styles.capacityText}>
                    <span>
                      <Users size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                      {limite ? (
                        <>
                          <strong>{ocupadas}</strong> / {limite} vagas
                        </>
                      ) : (
                        <>
                          <strong>{ocupadas}</strong> inscritos
                        </>
                      )}
                    </span>
                    {form.inscricoesAbertas ? (
                      <span className={styles.openBadge}>Abertas</span>
                    ) : (
                      <span className={styles.closedBadge}>Fechadas</span>
                    )}
                  </div>

                  {limite && (
                    <div
                      className={styles.progressBarTrack}
                      role="progressbar"
                      aria-valuenow={ocupadas}
                      aria-valuemin={0}
                      aria-valuemax={limite}
                      title={`${occupancyPct}% das vagas ocupadas`}
                    >
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: `${occupancyPct}%`,
                          backgroundColor: occupancyPct >= 100 ? '#b91c1c' : undefined,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Coluna 4: Ações com Hierarquia Clara */}
                <div className={styles.actionsCol}>
                  <button
                    type="button"
                    className={styles.manageBtn}
                    onClick={() => handlePrimaryManage(form)}
                    title={`Gerenciar painel de ${form.titulo}`}
                  >
                    <SlidersHorizontal size={14} aria-hidden="true" />
                    <span>Gerenciar</span>
                  </button>

                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => onResponses && onResponses(form)}
                    title={`Ver inscrições de ${form.titulo}`}
                  >
                    <Users size={14} aria-hidden="true" />
                    <span>Inscrições</span>
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className={styles.moreBtn}
                      onClick={() => toggleMenu(form._id)}
                      aria-label={`Mais ações para ${form.titulo}`}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className={styles.menuDropdown}
                        role="menu"
                        aria-label={`Ações secundárias para ${form.titulo}`}
                      >
                        <button
                          type="button"
                          className={styles.menuItem}
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null)
                            if (onEdit) onEdit(form)
                          }}
                        >
                          <Pencil size={14} />
                          <span>Editar configurações</span>
                        </button>

                        <button
                          type="button"
                          className={styles.menuItem}
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null)
                            if (onDuplicate) onDuplicate(form)
                          }}
                        >
                          <CopyPlus size={14} />
                          <span>Duplicar evento</span>
                        </button>

                        {form.status === 'rascunho' && (
                          <button
                            type="button"
                            className={styles.menuItem}
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null)
                              if (onPublish) onPublish(form)
                            }}
                          >
                            <Send size={14} />
                            <span>Publicar evento</span>
                          </button>
                        )}

                        {form.status !== 'arquivado' && (
                          <button
                            type="button"
                            className={styles.menuItem}
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null)
                              if (onArchive) onArchive(form)
                            }}
                          >
                            <Archive size={14} />
                            <span>Arquivar</span>
                          </button>
                        )}

                        <div className={styles.menuDivider} aria-hidden="true" />

                        <button
                          type="button"
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null)
                            if (onDelete) onDelete(form)
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Excluir evento</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
