import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  SlidersHorizontal,
  List,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Logo from '../../assets/img/logo-cemi.png';
import { Context } from '../../context/UserContext';
import useSearchParamsState from '../../hooks/useSearchParamsState';
import useDebounce from '../../hooks/useDebounce';
import useBurialSearch from '../../hooks/useBurialSearch';
import useRecentBurials from '../../hooks/useRecentBurials';
import { readSearchHistory } from '../../hooks/useSearchHistory';
import {
  openGoogleMaps,
  resolveMapPlusCode,
} from '../../services/burialService';
import { formatBurialLocationCopy } from '../../utils/formatBurialLocation';
import BurialResultCard from '../../components/memorial/BurialResultCard/BurialResultCard';
import BurialMap from '../../components/memorial/BurialMap/BurialMap';
import BurialDetailsDrawer from '../../components/memorial/BurialDetailsDrawer/BurialDetailsDrawer';
import SearchSkeleton from '../../components/memorial/SearchSkeleton/SearchSkeleton';
import {
  SearchEmptyState,
  SearchErrorState,
  SearchWelcomeState,
} from '../../components/memorial/SearchStates/SearchStates';
import styles from './CemeterySearchPage.module.css';

const ORDEM_LABELS = {
  relevancia: 'Melhor correspondência',
  nome: 'Ordem alfabética',
  recentes: 'Mais recentes',
};

export default function CemeterySearchPage() {
  const { authenticated, logout, user } = useContext(Context);
  const storedRole = (() => {
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      return String(auth.role || '').toLowerCase();
    } catch {
      return '';
    }
  })();
  const role = String(user?.role || storedRole || '').toLowerCase();
  const isAdmin = role === 'admin' || !!user?.isAdmin;
  const isConcessionario = role === 'concessionario';
  const { state, setState, clearFilters } = useSearchParamsState();
  const [inputQ, setInputQ] = useState(state.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [copyId, setCopyId] = useState('');
  const [history, setHistory] = useState([]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchFormRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  const debouncedQ = useDebounce(inputQ.trim(), 400);
  const isDebouncing = debouncedQ !== inputQ.trim() && inputQ.trim().length >= 2;

  const hasQuery = state.q.trim().length >= 2;
  const showResults = hasQuery || isDebouncing;
  const showWelcome = !showResults;
  const { items, total, page, pages, loading, error, retry } = useBurialSearch(state, {
    enabled: hasQuery,
  });
  const {
    items: recentItems,
    loading: recentLoading,
    error: recentError,
    retry: retryRecent,
  } = useRecentBurials({ enabled: showWelcome });

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const safeRecentItems = useMemo(
    () => (Array.isArray(recentItems) ? recentItems : []),
    [recentItems]
  );
  const safeHistory = useMemo(
    () => (Array.isArray(history) ? history.filter(Boolean) : []),
    [history]
  );

  useEffect(() => {
    setInputQ(state.q);
  }, [state.q]);

  useEffect(() => {
    if (debouncedQ.length >= 2) {
      setState({ q: debouncedQ, page: 1 }, { replace: true });
      return;
    }
    if (debouncedQ.length === 0 && state.q) {
      setState({ q: '', page: 1 }, { replace: true });
    }
  }, [debouncedQ, setState, state.q]);

  useEffect(() => {
    setHistory(readSearchHistory());
  }, [total, state.q]);

  // Detecta teclado virtual (visualViewport) para compactar o chrome e liberar resultados.
  useEffect(() => {
    const syncKeyboard = () => {
      const vv = window.visualViewport;
      const open = vv ? window.innerHeight - vv.height > 100 : false;
      setKeyboardOpen(open);
      if (vv) {
        document.documentElement.style.setProperty(
          '--memorial-vv-height',
          `${Math.round(vv.height)}px`
        );
      }
    };
    syncKeyboard();
    window.visualViewport?.addEventListener('resize', syncKeyboard);
    window.visualViewport?.addEventListener('scroll', syncKeyboard);
    window.addEventListener('resize', syncKeyboard);
    return () => {
      window.visualViewport?.removeEventListener('resize', syncKeyboard);
      window.visualViewport?.removeEventListener('scroll', syncKeyboard);
      window.removeEventListener('resize', syncKeyboard);
    };
  }, []);

  const ensureSearchVisible = useCallback(() => {
    const form = searchFormRef.current;
    if (!form || typeof form.scrollIntoView !== 'function') return;
    window.requestAnimationFrame(() => {
      // Ancora no formulário (não no hero com texto), para o campo ficar no topo útil.
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const ensureResultsVisible = useCallback(() => {
    const el = resultsRef.current;
    if (!el) return;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  useEffect(() => {
    if (!showResults || loading || isDebouncing) return;
    if (safeItems.length === 0 && !error) return;
    ensureResultsVisible();
  }, [showResults, loading, isDebouncing, safeItems.length, error, ensureResultsVisible]);

  const submitSearch = useCallback(
    (term) => {
      const q = String(term ?? inputQ).trim();
      if (q.length < 2) return;
      setInputQ(q);
      setState({ q, busca: q, page: 1 });
      setFiltersOpen(false);
      // Fecha o teclado no mobile após Buscar/Enter para revelar a lista.
      searchInputRef.current?.blur?.();
      setSearchFocused(false);
      ensureSearchVisible();
      window.setTimeout(ensureResultsVisible, 80);
    },
    [inputQ, setState, ensureSearchVisible, ensureResultsVisible]
  );

  const applyFilters = (patch) => {
    setState({ ...patch, page: 1 });
  };

  const handleViewMap = async (burial) => {
    setSelected(burial);
    setState({ view: 'map' });
    setMapLoading(true);
    try {
      const plus = burial.plusCode || (await resolveMapPlusCode(burial.block || burial.sector));
      if (plus) openGoogleMaps(plus);
    } catch {
      /* mapa interno permanece visível */
    } finally {
      setMapLoading(false);
    }
  };

  const handleShare = async (burial) => {
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(burial.fullName)}`;
    const text = formatBurialLocationCopy(burial);
    if (navigator.share) {
      try {
        await navigator.share({ title: burial.fullName, text, url });
        return;
      } catch {
        /* fallback */
      }
    }
    await navigator.clipboard?.writeText(`${text}\n${url}`);
    setCopyId(burial.id);
    setTimeout(() => setCopyId(''), 2000);
  };

  const handleCopy = async (burial) => {
    const text = formatBurialLocationCopy(burial);
    await navigator.clipboard?.writeText(text);
    setCopyId(burial.id);
    setTimeout(() => setCopyId(''), 2000);
  };

  const handleHelpClick = useCallback(
    (e) => {
      e.preventDefault();
      setInputQ('');
      setState({ q: '', page: 1, view: 'list' }, { replace: true });
      window.requestAnimationFrame(() => {
        document.getElementById('ajuda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [setState]
  );

  const activeFilterChips = [
    state.rua && { key: 'rua', label: `Rua ${state.rua}` },
    state.quadra && { key: 'quadra', label: `Quadra ${state.quadra}` },
    state.chapa && { key: 'chapa', label: `Placa ${state.chapa}` },
    state.setor && { key: 'setor', label: `Setor ${state.setor}` },
    state.anoFalecimento && { key: 'anoFalecimento', label: `Ano ${state.anoFalecimento}` },
    state.comFoto && { key: 'comFoto', label: 'Com foto' },
  ].filter(Boolean);

  return (
    <div
      className={[
        styles.page,
        keyboardOpen || searchFocused ? styles.pageCompact : '',
        filtersOpen ? styles.sheetOpen : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link to="/" className={styles.brand}>
            <img src={Logo} alt="" width={36} height={36} />
            <span>Memorial Santa Faustina</span>
          </Link>
          <nav className={styles.topnav} aria-label="Navegação principal">
            <Link to="/">Início</Link>
            <a href="#ajuda" className={styles.helpLink} onClick={handleHelpClick}>
              Ajuda
            </a>
            {authenticated ? (
              <>
                {(isAdmin || isConcessionario) && (
                  <Link to="/sepultados/meumemorial">Memorial</Link>
                )}
                {isAdmin && <Link to="/meuusuario">Usuários</Link>}
                {isAdmin && <Link to="/compliance">Compliance</Link>}
                <Link to="/user/profile">Perfil</Link>
                <button type="button" onClick={() => logout()} className={styles.linkBtn}>
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login">Entrar</Link>
            )}
          </nav>

          {/* Mobile: conta + filtros na navbar */}
          <div className={styles.navMobileActions}>
            {authenticated ? (
              <Link to="/user/profile" className={styles.navAccountBtn}>
                Perfil
              </Link>
            ) : (
              <Link to="/login" className={styles.navAccountBtn}>
                Entrar
              </Link>
            )}
            <button
              type="button"
              className={styles.navFilterBtn}
              aria-expanded={filtersOpen}
              aria-controls="memorial-filters-sheet"
              onClick={() => {
                setFiltersOpen(true);
                searchInputRef.current?.blur?.();
              }}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              <span>Filtros</span>
              {activeFilterChips.length > 0 && (
                <span className={styles.filterBadge}>{activeFilterChips.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile: busca flutuante/sticky dentro do header (sem título/texto) */}
        <form
          ref={searchFormRef}
          className={styles.mobileSearchDock}
          role="search"
          data-memorial-search="true"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <label htmlFor="burial-search-input-mobile" className="sr-only">
            Nome da pessoa falecida
          </label>
          <div className={`${styles.searchField} searchField`}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="burial-search-input-mobile"
              ref={searchInputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Buscar sepultura…"
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              onFocus={() => {
                setSearchFocused(true);
              }}
              onBlur={() => {
                window.setTimeout(() => setSearchFocused(false), 180);
              }}
              minLength={2}
              aria-describedby="search-live-status"
            />
            {inputQ ? (
              <button
                type="button"
                className={styles.clearBtn}
                aria-label="Limpar busca"
                onClick={() => {
                  setInputQ('');
                  setState({ q: '', page: 1 });
                }}
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            className={styles.searchBtnIcon}
            disabled={inputQ.trim().length < 2}
            aria-label="Buscar"
          >
            <Search size={18} />
          </button>
        </form>
      </header>

      <main className={styles.main} id="main-content">
        {/* Desktop: hero completo */}
        <section className={styles.heroDesktop} aria-labelledby="search-title">
          <h1 id="search-title">Encontre uma sepultura</h1>
          <p className={styles.lead}>
            Pesquise pelo nome da pessoa falecida e consulte a localização dentro do Memorial Santa Faustina.
            <span className={styles.leadHint}> Os resultados aparecem automaticamente ao digitar.</span>
          </p>

          <form
            className={styles.searchForm}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <label htmlFor="burial-search-input" className="sr-only">
              Nome da pessoa falecida
            </label>
            <div className={`${styles.searchField} searchField`}>
              <Search size={20} className={styles.searchIcon} aria-hidden="true" />
              <input
                id="burial-search-input"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Digite o nome da pessoa falecida"
                value={inputQ}
                onChange={(e) => setInputQ(e.target.value)}
                minLength={2}
              />
              {inputQ && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  aria-label="Limpar busca"
                  onClick={() => {
                    setInputQ('');
                    setState({ q: '', page: 1 });
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button type="submit" className={styles.searchBtn} disabled={inputQ.trim().length < 2}>
              Buscar
            </button>
          </form>

          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={18} /> Filtros
            </button>
            {activeFilterChips.length > 0 && (
              <div className={styles.chips}>
                {activeFilterChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={styles.chip}
                    onClick={() => setState({ [c.key]: c.key === 'comFoto' ? false : '' })}
                  >
                    {c.label} ×
                  </button>
                ))}
                <button type="button" className={styles.chipClear} onClick={clearFilters}>
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {filtersOpen && (
            <div className={styles.filtersPanelDesktop}>
              <div className={styles.filterGrid}>
                <label>
                  Rua
                  <input
                    value={state.rua}
                    onChange={(e) => applyFilters({ rua: e.target.value })}
                    placeholder="Ex.: F3"
                  />
                </label>
                <label>
                  Quadra
                  <input
                    value={state.quadra}
                    onChange={(e) => applyFilters({ quadra: e.target.value })}
                    placeholder="Ex.: 02"
                  />
                </label>
                <label>
                  Placa
                  <input
                    value={state.chapa}
                    onChange={(e) => applyFilters({ chapa: e.target.value })}
                    placeholder="Número da placa"
                  />
                </label>
                <label>
                  Setor
                  <input
                    value={state.setor}
                    onChange={(e) => applyFilters({ setor: e.target.value })}
                  />
                </label>
                <label>
                  Ano de falecimento
                  <input
                    value={state.anoFalecimento}
                    onChange={(e) => applyFilters({ anoFalecimento: e.target.value })}
                    placeholder="Ex.: 2024"
                  />
                </label>
                <label>
                  Ordenação
                  <select
                    value={state.ordem}
                    onChange={(e) => applyFilters({ ordem: e.target.value })}
                  >
                    <option value="relevancia">Melhor correspondência</option>
                    <option value="nome">Ordem alfabética</option>
                    <option value="recentes">Mais recentes</option>
                  </select>
                </label>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={state.comFoto}
                    onChange={(e) => applyFilters({ comFoto: e.target.checked })}
                  />
                  Somente com foto
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Chips ativos no mobile (fora do sheet) */}
        {activeFilterChips.length > 0 && (
          <div className={styles.mobileChips}>
            {activeFilterChips.map((c) => (
              <button
                key={c.key}
                type="button"
                className={styles.chip}
                onClick={() => setState({ [c.key]: c.key === 'comFoto' ? false : '' })}
              >
                {c.label} ×
              </button>
            ))}
            <button type="button" className={styles.chipClear} onClick={clearFilters}>
              Limpar
            </button>
          </div>
        )}

        <div className={styles.contentWrap} ref={resultsRef}>
          <p id="search-live-status" className="sr-only" aria-live="polite" aria-atomic="true">
            {isDebouncing || loading
              ? `Buscando resultados para ${inputQ.trim()}`
              : hasQuery
                ? `${total} resultados para ${state.q}`
                : ''}
          </p>

          {showWelcome && (
            <>
              <div id="ajuda">
                <SearchWelcomeState
                  history={safeHistory}
                  onPickTerm={(term) => {
                    setInputQ(term);
                    submitSearch(term);
                  }}
                />
              </div>

              <section className={styles.recentSection} aria-labelledby="recent-burials-title">
                <div className={styles.recentHeader}>
                  <h2 id="recent-burials-title">Sepultamentos recentes</h2>
                  <p className={styles.recentHint}>
                    Últimos registros consultáveis no memorial.
                  </p>
                </div>

                {recentLoading && <SearchSkeleton count={5} />}
                {recentError && !recentLoading && (
                  <SearchErrorState message={recentError} onRetry={retryRecent} />
                )}
                {!recentLoading && !recentError && safeRecentItems.length > 0 && (
                  <ul className={styles.list} aria-label="Sepultamentos recentes">
                    {safeRecentItems.map((burial) => (
                      <li key={burial?.id || burial?.fullName}>
                        <BurialResultCard
                          burial={burial}
                          searchTerm=""
                          selected={selected?.id === burial?.id}
                          copyOk={copyId === burial?.id}
                          onSelect={setSelected}
                          onViewMap={handleViewMap}
                          onDetails={(b) => {
                            setSelected(b);
                            setDrawerOpen(true);
                          }}
                          onShare={handleShare}
                          onCopy={handleCopy}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {!recentLoading && !recentError && safeRecentItems.length === 0 && (
                  <p className={styles.recentEmpty} role="status">
                    Nenhum sepultamento recente disponível no momento.
                  </p>
                )}
              </section>
            </>
          )}

          {showResults && (
            <>
              <div className={styles.resultsHeader}>
                <div className={styles.resultsSummary}>
                  {loading || isDebouncing ? (
                    <span>
                      Buscando resultados para &ldquo;{inputQ.trim() || state.q}&rdquo;…
                    </span>
                  ) : error ? null : (
                    <span>
                      <strong>{total}</strong> resultado{total !== 1 ? 's' : ''} para &ldquo;
                      {state.q}&rdquo;
                      {state.ordem !== 'relevancia' && (
                        <> · {ORDEM_LABELS[state.ordem] || state.ordem}</>
                      )}
                    </span>
                  )}
                </div>
                <div className={styles.viewToggle} role="group" aria-label="Modo de visualização">
                  <button
                    type="button"
                    className={state.view === 'list' ? styles.viewActive : ''}
                    onClick={() => setState({ view: 'list' })}
                  >
                    <List size={18} /> Lista
                  </button>
                  <button
                    type="button"
                    className={state.view === 'map' ? styles.viewActive : ''}
                    onClick={() => setState({ view: 'map' })}
                  >
                    <MapIcon size={18} /> Mapa
                  </button>
                </div>
              </div>

              {(loading || isDebouncing) && <SearchSkeleton count={4} />}
              {error && !loading && !isDebouncing && <SearchErrorState message={error} onRetry={retry} />}
              {!loading && !isDebouncing && !error && hasQuery && safeItems.length === 0 && (
                <SearchEmptyState searchTerm={state.q} onClearFilters={clearFilters} />
              )}

              {!loading && !error && safeItems.length > 0 && (
                <div
                  className={`${styles.split} ${state.view === 'map' ? styles.splitMap : ''}`}
                >
                  <div className={styles.listCol}>
                    <ul className={styles.list} aria-label="Resultados da busca">
                      {safeItems.map((burial) => (
                        <li key={burial?.id || burial?.fullName}>
                          <BurialResultCard
                            burial={burial}
                            searchTerm={state.q}
                            selected={selected?.id === burial?.id}
                            copyOk={copyId === burial?.id}
                            onSelect={setSelected}
                            onViewMap={handleViewMap}
                            onDetails={(b) => {
                              setSelected(b);
                              setDrawerOpen(true);
                            }}
                            onShare={handleShare}
                            onCopy={handleCopy}
                          />
                        </li>
                      ))}
                    </ul>

                    {pages > 1 && (
                      <nav className={styles.pagination} aria-label="Paginação">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setState({ page: page - 1 })}
                        >
                          <ChevronLeft size={18} /> Anterior
                        </button>
                        <span>
                          Página {page} de {pages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= pages}
                          onClick={() => setState({ page: page + 1 })}
                        >
                          Próxima <ChevronRight size={18} />
                        </button>
                      </nav>
                    )}
                  </div>

                  {(state.view === 'map' || safeItems.length > 0) && (
                    <div className={styles.mapCol}>
                      <BurialMap
                        burial={selected || safeItems[0]}
                        loading={mapLoading}
                        onOpenExternal={handleViewMap}
                        onClose={
                          state.view === 'map'
                            ? () => setState({ view: 'list' })
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <p className={styles.institutional}>
            Acervo memorial com milhares de registros — busca realizada no servidor para maior
            precisão e desempenho.
          </p>
        </div>
      </main>

      <BurialDetailsDrawer
        burial={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onViewMap={handleViewMap}
        onShare={handleShare}
      />

      {/* Mobile: filtros em bottom sheet flutuante */}
      {filtersOpen && (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onClick={() => setFiltersOpen(false)}
        />
      )}
      <div
        id="memorial-filters-sheet"
        className={`${styles.filterSheet} ${filtersOpen ? styles.filterSheetOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros de busca"
        aria-hidden={!filtersOpen}
      >
        <div className={styles.sheetGrab} aria-hidden="true" />
        <div className={styles.sheetHeader}>
          <h2>Filtros</h2>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label="Fechar filtros"
            onClick={() => setFiltersOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.filterGrid}>
          <label>
            Rua
            <input
              value={state.rua}
              onChange={(e) => applyFilters({ rua: e.target.value })}
              placeholder="Ex.: F3"
            />
          </label>
          <label>
            Quadra
            <input
              value={state.quadra}
              onChange={(e) => applyFilters({ quadra: e.target.value })}
              placeholder="Ex.: 02"
            />
          </label>
          <label>
            Placa
            <input
              value={state.chapa}
              onChange={(e) => applyFilters({ chapa: e.target.value })}
              placeholder="Número da placa"
            />
          </label>
          <label>
            Setor
            <input
              value={state.setor}
              onChange={(e) => applyFilters({ setor: e.target.value })}
            />
          </label>
          <label>
            Ano de falecimento
            <input
              value={state.anoFalecimento}
              onChange={(e) => applyFilters({ anoFalecimento: e.target.value })}
              placeholder="Ex.: 2024"
            />
          </label>
          <label>
            Ordenação
            <select
              value={state.ordem}
              onChange={(e) => applyFilters({ ordem: e.target.value })}
            >
              <option value="relevancia">Melhor correspondência</option>
              <option value="nome">Ordem alfabética</option>
              <option value="recentes">Mais recentes</option>
            </select>
          </label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={state.comFoto}
              onChange={(e) => applyFilters({ comFoto: e.target.checked })}
            />
            Somente com foto
          </label>
        </div>
        <div className={styles.sheetActions}>
          <button type="button" className={styles.chipClear} onClick={clearFilters}>
            Limpar
          </button>
          <button
            type="button"
            className={styles.sheetApply}
            onClick={() => setFiltersOpen(false)}
          >
            Ver resultados
          </button>
        </div>
      </div>

      {state.view === 'map' && selected && (
        <button
          type="button"
          className={styles.fabMap}
          onClick={() => setState({ view: 'map' })}
          aria-label="Ver mapa em tela cheia"
        >
          <MapIcon size={22} /> Mapa
        </button>
      )}
    </div>
  );
}
