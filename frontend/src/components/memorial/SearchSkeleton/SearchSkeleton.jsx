import styles from './SearchSkeleton.module.css';

export default function SearchSkeleton({ count = 4 }) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.avatar} />
          <div className={styles.lines}>
            <div className={styles.lineLg} />
            <div className={styles.lineMd} />
            <div className={styles.lineSm} />
          </div>
        </div>
      ))}
    </div>
  );
}
