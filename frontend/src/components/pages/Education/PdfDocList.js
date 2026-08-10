import { formatDateTime, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function PdfDocList({ items }) {
  if (!items?.length) return null

  return (
    <ul className={styles.doc_list}>
      {items.map((item) => (
        <li key={item._id}>
          <a
            href={mediaUrl(item.fileUrl)}
            className={styles.doc_list_card}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h4 className={styles.doc_list_card_title}>{item.title}</h4>
            <p className={styles.muted}>{formatDateTime(item.createdAt)}</p>
            <span className={styles.doc_list_card_action}>Abrir PDF</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
