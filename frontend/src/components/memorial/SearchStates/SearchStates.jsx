import { Link } from 'react-router-dom';
import { SearchX, RefreshCw, HelpCircle } from 'lucide-react';
import styles from './SearchStates.module.css';

export function SearchEmptyState({ searchTerm, onClearFilters }) {
  return (
    <div className={styles.state} role="status">
      <SearchX size={48} className={styles.icon} aria-hidden="true" />
      <h2>Nenhuma sepultura foi encontrada</h2>
      {searchTerm ? (
        <p>
          Não encontramos resultados para <strong>&ldquo;{searchTerm}&rdquo;</strong>.
        </p>
      ) : (
        <p>Informe o nome da pessoa falecida para iniciar a busca.</p>
      )}
      <p className={styles.hint}>
        Verifique a grafia do nome ou tente pesquisar apenas pelo primeiro nome ou sobrenome.
      </p>
      <div className={styles.actions}>
        {onClearFilters && (
          <button type="button" className={styles.btnSecondary} onClick={onClearFilters}>
            Limpar filtros
          </button>
        )}
        <a href="/#ajuda" className={styles.btnGhost}>
          <HelpCircle size={18} aria-hidden="true" /> Ajuda
        </a>
      </div>
    </div>
  );
}

export function SearchErrorState({ message, onRetry }) {
  return (
    <div className={styles.state} role="alert">
      <p className={styles.errorTitle}>Não foi possível realizar a busca agora.</p>
      <p className={styles.hint}>{message}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.btnPrimary} onClick={onRetry}>
          <RefreshCw size={18} aria-hidden="true" /> Tentar novamente
        </button>
        <Link to="/" className={styles.btnGhost}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export function SearchWelcomeState({ history = [], onPickTerm }) {
  return (
    <div className={styles.welcome}>
      <h2>Como localizar uma sepultura</h2>
      <ul>
        <li>Pesquise pelo nome completo ou por parte do nome.</li>
        <li>Use os filtros para refinar por rua, quadra ou placa.</li>
        <li>Abra &ldquo;Ver localização&rdquo; para orientação no mapa do memorial.</li>
      </ul>
      {history.length > 0 && (
        <div className={styles.history}>
          <h3>Pesquisas recentes</h3>
          <div className={styles.chips}>
            {history.map((term) => (
              <button
                key={term}
                type="button"
                className={styles.chip}
                onClick={() => onPickTerm(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
