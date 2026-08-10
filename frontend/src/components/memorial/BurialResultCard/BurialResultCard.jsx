import { MapPin, Share2, Copy, Info, CheckCircle2 } from 'lucide-react';
import { formatBurialLocation, formatDateDisplay } from '../../../utils/formatBurialLocation';
import styles from './BurialResultCard.module.css';

function highlightTerm(text, term) {
  if (!text || !term || term.length < 2) return text;
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  const idx = lower.indexOf(t);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.mark}>{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export default function BurialResultCard({
  burial,
  searchTerm,
  selected,
  onSelect,
  onViewMap,
  onDetails,
  onShare,
  onCopy,
  copyOk,
}) {
  const location = formatBurialLocation(burial);
  const birth = formatDateDisplay(burial.birthDate);
  const death = formatDateDisplay(burial.deathDate);

  return (
    <article
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect?.(burial)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(burial);
        }
      }}
      tabIndex={0}
    >
      <div className={styles.media}>
        {burial.photoUrl ? (
          <img
            src={burial.photoUrl}
            alt=""
            loading="lazy"
            width={56}
            height={56}
            className={styles.photo}
          />
        ) : (
          <div className={styles.avatar} aria-hidden="true">
            {burial.initials}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{highlightTerm(burial.fullName, searchTerm)}</h3>
        {(birth || death) && (
          <p className={styles.dates}>
            {birth && <span>Nasc.: {birth}</span>}
            {birth && death && ' · '}
            {death && <span>Falec.: {death}</span>}
          </p>
        )}
        <div className={styles.locationBlock}>
          <span className={styles.locationLabel}>Localização</span>
          <p className={styles.location}>{highlightTerm(location, searchTerm)}</p>
          {burial.hasLocation && (
            <span className={styles.badge}>
              <CheckCircle2 size={14} aria-hidden="true" /> Localização disponível
            </span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={(e) => {
            e.stopPropagation();
            onViewMap?.(burial);
          }}
        >
          <MapPin size={18} aria-hidden="true" />
          Ver localização
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={(e) => {
            e.stopPropagation();
            onDetails?.(burial);
          }}
        >
          <Info size={16} aria-hidden="true" />
          Detalhes
        </button>
        <div className={styles.iconRow}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Compartilhar localização"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(burial);
            }}
          >
            <Share2 size={18} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={copyOk ? 'Localização copiada' : 'Copiar localização'}
            onClick={(e) => {
              e.stopPropagation();
              onCopy?.(burial);
            }}
          >
            <Copy size={18} />
          </button>
        </div>
        {copyOk && <span className={styles.copyOk} role="status">Copiado!</span>}
      </div>
    </article>
  );
}
