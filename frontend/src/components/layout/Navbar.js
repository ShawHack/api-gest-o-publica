import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../assets/img/logo-cemi.png';
import styles from './Navbar.module.css';
import { Context } from '../../context/UserContext';
import api from '../../utils/api';
import useRole from '../../hooks/useRole.js';
import { Home, BookOpen, Users, User, LogOut, LogIn, UserPlus } from 'lucide-react';


function Navbar() {
  const { authenticated, logout } = useContext(Context);

  // Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // Menu sanduíche
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Roteamento
  const navigate = useNavigate();
  const location = useLocation();

  // Papel/token
  const { roleLoaded, token, isAdmin, isConcessionario } = useRole();

  // Regras da busca
  const hiddenSearchRoutes = ['/login', '/register', '/sepultados/add'];
  const isEditRoute = location.pathname.includes('/sepultados/edit/');
  const isMonitoramento = location.pathname.includes('/shift-handovers');
  const shouldShowSearch =
    authenticated && !hiddenSearchRoutes.includes(location.pathname) && !isEditRoute && !isMonitoramento;

  // Debounce da busca
  useEffect(() => {
    if (!shouldShowSearch) return;
    const t = setTimeout(() => {
      if (searchTerm.trim().length >= 2) fetchSuggestions(searchTerm);
      else { setSuggestions([]); setShowSuggestions(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, shouldShowSearch]);

  // Fecha dropdown e menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fecha o menu quando a rota muda
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Busca sugestões
  const fetchSuggestions = async (term) => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.get(
        `/sepultados/sugestoes?q=${encodeURIComponent(term)}`,
        { headers }
      );
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/sepulturas?q=${encodeURIComponent(searchTerm.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (sep) => {
    navigate(`/sepultados/${sep._id}`);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  // === Compartilhar ===
  const SHARE_URL = 'https://api.garca.sp.gov.br/';
  const handleShare = async () => {
    const shareData = {
      title: 'Santa Faustina',
      text: 'Acesse este link:',
      url: SHARE_URL,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        window.open(SHARE_URL, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(SHARE_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLogout = () => {
    if (isMonitoramento) {
      logout('/monitoramento/login');
    } else {
      logout();
    }
  };

  return (
    <nav className={styles.navbar} ref={navRef}>
      {/* Coluna 1: seta + logo/título */}
      <div className={styles.left}>
        {!isMonitoramento && (
          <Link
            to="/"
            aria-label="Ir para a Home"
            className={styles.back_btn}
            title="Home"
          >
            <Home className={styles.icon} aria-hidden="true" />
          </Link>
        )}


        <div className={styles.navbar_logo}>
          {!isMonitoramento && <img src={Logo} alt="Cemiterio" />}
          <h1 className={isMonitoramento ? styles.title_monitoramento : ''}>
            {isMonitoramento ? 'Monitoramento Semit' : 'Memorial Santa Faustina'}
          </h1>
        </div>
      </div>

      {/* Coluna 2: busca (em tablet/mobile vai para a 2ª linha) */}
      {shouldShowSearch && (
        <div className={styles.search_container} ref={searchRef}>
          <form onSubmit={handleSearch} className={styles.search_form}>
            <input
              type="text"
              placeholder="Pesquisar sepultados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.search_input}
              onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
            />
            <button type="submit" className={styles.search_button} disabled={!searchTerm.trim()}>
              🔍
            </button>
          </form>

          {showSuggestions && (
            <div className={styles.suggestions_dropdown}>
              {loading && (
                <div className={styles.suggestion_item}><span>Pesquisando...</span></div>
              )}
              {!loading && suggestions.length > 0 && (
                <>
                  {suggestions.map((s, i) => (
                    <div
                      key={s._id || i}
                      className={styles.suggestion_item}
                      onClick={() => handleSuggestionClick(s)}
                    >
                      <div className={styles.suggestion_content}>
                        <strong>{s.nome}</strong><br />
                        {s.rua && <span> Rua: {s.rua}</span>}
                        {s.quadra && <span>, Quadra: {s.quadra}</span>}
                        {s.chapa && <span>, Placa: {s.chapa}</span>}
                      </div>
                    </div>
                  ))}
                  {searchTerm.trim() && (
                    <div className={styles.suggestion_item_all} onClick={handleSearch}>
                      Ver todos os resultados para "{searchTerm}"
                    </div>
                  )}
                </>
              )}
              {!loading && suggestions.length === 0 && searchTerm.trim().length >= 2 && (
                <div className={styles.suggestion_item}><span>Nenhuma sugestão encontrada</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Coluna 3: área direita (links/compartilhar/hambúrguer) */}
      <div className={styles.right}>
        {/* Links: desktop visível; em tablet/mobile vira dropdown absoluto */}




        <ul
          id="primary-navigation"
          className={`${styles.nav_links} ${menuOpen ? styles.active : ''}`}
        >
          {!isMonitoramento && (
            <li>
              <Link to="/">
                <Home className={styles.item_icon} aria-hidden="true" />
                <span>Home</span>
              </Link>
            </li>
          )}

          {authenticated ? (
            <>
              {!isMonitoramento && roleLoaded && (isAdmin || isConcessionario) && (
                <li>
                  <Link to="/sepultados/meumemorial" className={styles.memorial_btn}>
                    <BookOpen className={styles.item_icon} aria-hidden="true" />
                    <span>Memorial</span>
                  </Link>
                </li>
              )}

              {!isMonitoramento && roleLoaded && isAdmin && (
                <li>
                  <Link to="/meuusuario" className={styles.users_btn}>
                    <Users className={styles.item_icon} aria-hidden="true" />
                    <span>Usuários</span>
                  </Link>
                </li>
              )}
              {!isMonitoramento && roleLoaded && isAdmin && (
                <li>
                  <Link to="/compliance" className={styles.users_btn}>
                    <Users className={styles.item_icon} aria-hidden="true" />
                    <span>Compliance</span>
                  </Link>
                </li>
              )}

              {!isMonitoramento && (
                <li>
                  <Link to="/user/profile" className={styles.profile_btn}>
                    <User className={styles.item_icon} aria-hidden="true" />
                    <span>Perfil</span>
                  </Link>
                </li>
              )}

              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={isMonitoramento ? styles.logout_monitoramento : styles.logout_btn}
                >
                  <LogOut className={styles.item_icon} aria-hidden="true" />
                  <span>Sair</span>
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">
                  <LogIn className={styles.item_icon} aria-hidden="true" />
                  <span>Entrar</span>
                </Link>
              </li>
              <li>
                <Link to="/register">
                  <UserPlus className={styles.item_icon} aria-hidden="true" />
                  <span>Cadastre-se</span>
                </Link>
              </li>
            </>
          )}
        </ul>




        {/* Hambúrguer (apenas tablet/mobile) */}
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
    </nav>
  );
}

export default Navbar;