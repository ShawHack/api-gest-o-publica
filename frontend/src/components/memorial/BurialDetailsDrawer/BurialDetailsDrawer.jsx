import { Link } from 'react-router-dom';
import { X, MapPin, Share2, Printer, ExternalLink } from 'lucide-react';
import { formatBurialLocation, formatDateDisplay } from '../../../utils/formatBurialLocation';
import styles from './BurialDetailsDrawer.module.css';

export default function BurialDetailsDrawer({ burial, open, onClose, onViewMap, onShare }) {
  if (!open || !burial) return null;

  const birth = formatDateDisplay(burial.birthDate);
  const death = formatDateDisplay(burial.deathDate);

  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="Fechar detalhes" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="burial-drawer-title">
        <header className={styles.header}>
          <h2 id="burial-drawer-title">Informações da sepultura</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={22} />
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.hero}>
            {burial.photoUrl ? (
              <img src={burial.photoUrl} alt="" className={styles.photo} loading="lazy" />
            ) : (
              <div className={styles.avatar}>{burial.initials}</div>
            )}
            <div>
              <h3>{burial.fullName}</h3>
              {(birth || death) && (
                <p className={styles.dates}>
                  {birth && <>Nascimento: {birth}<br /></>}
                  {death && <>Falecimento: {death}</>}
                </p>
              )}
            </div>
          </div>

          <section className={styles.section}>
            <h4>Localização da sepultura</h4>
            <p>{formatBurialLocation(burial)}</p>
            {burial.burialType && <p className={styles.meta}>Tipo: {burial.burialType}</p>}
          </section>

          <div className={styles.actions}>
            <button type="button" className={styles.btnPrimary} onClick={() => onViewMap?.(burial)}>
              <MapPin size={18} /> Ver no mapa
            </button>
            <Link to={`/sepultados/${burial.id}`} className={styles.btnSecondary}>
              <ExternalLink size={18} /> Página completa
            </Link>
            <button type="button" className={styles.btnGhost} onClick={() => onShare?.(burial)}>
              <Share2 size={18} /> Compartilhar
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => window.print()}>
              <Printer size={18} /> Imprimir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
