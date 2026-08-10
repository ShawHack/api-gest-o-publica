import { MapPin, Navigation, X } from 'lucide-react';
import { formatBurialLocation } from '../../../utils/formatBurialLocation';
import styles from './BurialMap.module.css';

export default function BurialMap({ burial, onClose, onOpenExternal, loading }) {
  const loc = burial ? formatBurialLocation(burial) : null;

  return (
    <div className={styles.wrap} role="region" aria-label="Mapa do memorial">
      <div className={styles.header}>
        <h2>Mapa do Memorial</h2>
        {onClose && (
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar mapa">
            <X size={20} />
          </button>
        )}
      </div>

      <div className={styles.canvas}>
        <svg viewBox="0 0 400 280" className={styles.svg} aria-hidden="true">
          <rect width="400" height="280" fill="#eef2ff" />
          <rect x="20" y="20" width="360" height="240" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" rx="8" />
          <text x="200" y="40" textAnchor="middle" fill="#64748b" fontSize="12">Entrada principal</text>
          <line x1="200" y1="50" x2="200" y2="240" stroke="#94a3b8" strokeDasharray="6 4" />
          {burial && (
            <>
              <circle cx="200" cy="140" r="14" fill="#ed9756" stroke="#364ba3" strokeWidth="3" />
              <circle cx="200" cy="140" r="22" fill="none" stroke="#364ba3" strokeWidth="2" opacity="0.4" />
            </>
          )}
          <text x="200" y="260" textAnchor="middle" fill="#475569" fontSize="11">
            Planta ilustrativa — integração com mapa real em evolução
          </text>
        </svg>

        {!burial && (
          <p className={styles.placeholder}>
            Selecione uma sepultura na lista para ver a localização no mapa.
          </p>
        )}
      </div>

      {burial && (
        <div className={styles.panel}>
          <p className={styles.name}>{burial.fullName}</p>
          <p className={styles.loc}>
            <MapPin size={16} aria-hidden="true" /> {loc}
          </p>
          <p className={styles.hint}>
            Siga até a quadra indicada. Em caso de dúvida, consulte a administração do memorial.
          </p>
          <button
            type="button"
            className={styles.btnMap}
            disabled={loading}
            onClick={() => onOpenExternal?.(burial)}
          >
            <Navigation size={18} aria-hidden="true" />
            {loading ? 'Abrindo mapa…' : 'Abrir no Google Maps'}
          </button>
        </div>
      )}

      <ul className={styles.legend}>
        <li><span className={styles.dotEntry} /> Entrada</li>
        <li><span className={styles.dotBurial} /> Sepultura selecionada</li>
      </ul>
    </div>
  );
}
