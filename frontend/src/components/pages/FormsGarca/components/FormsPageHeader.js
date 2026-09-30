import React from 'react'
import styles from './FormsPageHeader.module.css'

export default function FormsPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}) {
  return (
    <div className={`${styles.pageHeader} ${className}`}>
      <div className={styles.titleArea}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        {title && <h1 className={styles.title}>{title}</h1>}
        {description && <p className={styles.description}>{description}</p>}
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
